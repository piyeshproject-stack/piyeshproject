export async function onRequestGet(context) {
    const { env } = context;
    if (!env.DB) return Response.json({ success: false, error: "Database not configured" });

    try {
        const p1 = env.DB.prepare("SELECT * FROM settings WHERE id = 1");
        const p2 = env.DB.prepare("SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order");
        const p3 = env.DB.prepare("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order");
        const p4 = env.DB.prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC");
        const p5 = env.DB.prepare("SELECT * FROM home_sections WHERE is_active = 1 ORDER BY sort_order");
        const p6 = env.DB.prepare("SELECT * FROM product_categories");

        const [settings, banners, categories, products, home_sections, product_categories] = await env.DB.batch([p1, p2, p3, p4, p5, p6]);

        // Cloudflare Env Var থেকে ভার্সন নির্বাচন (TEMPLATE_VERSION বা VERSION)
        const rawVersion = (env.TEMPLATE_VERSION || env.VERSION || env.SITE_VERSION || env.THEME_VERSION || '').toString().trim().toLowerCase();
        const templateVersion = (rawVersion === 'v2' || rawVersion === '2') ? 'v2' : (rawVersion === 'v1' || rawVersion === '1' ? 'v1' : null);

        // Cloudflare Env Var থেকে ব্র্যান্ড কালার নির্বাচন (BRAND_COLORS বা THEME_COLORS)
        const brandColors = env.BRAND_COLORS || env.THEME_COLORS || env.THEME_CSS || null;

        const allProducts = products.results || [];

        // 100 products per chunk (sub-files/chunks)
        const CHUNK_SIZE = 100;
        const product_chunks = [];
        for (let i = 0; i < allProducts.length; i += CHUNK_SIZE) {
            const chunkSlice = allProducts.slice(i, i + CHUNK_SIZE);
            product_chunks.push({
                chunk_id: Math.floor(i / CHUNK_SIZE) + 1,
                start_index: i,
                end_index: i + chunkSlice.length,
                count: chunkSlice.length,
                products: chunkSlice
            });
        }

        // Check if caller specifically requested a sub-chunk (e.g. ?chunk=1)
        const url = new URL(context.request.url);
        const chunkParam = url.searchParams.get("chunk");
        if (chunkParam) {
            const targetId = parseInt(chunkParam, 10);
            const foundChunk = product_chunks.find(c => c.chunk_id === targetId) || product_chunks[targetId - 1] || null;
            return new Response(JSON.stringify({
                success: true,
                chunk_id: targetId,
                total_chunks: product_chunks.length,
                total_products: allProducts.length,
                chunk: foundChunk
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                    // Caching is 100% controlled by Cloudflare Dashboard Cache Rules per domain (no hardcoded Cache-Control)
                }
            });
        }

        // Master file: contains settings, banners, categories, home sections, sub-file product chunks (100 products each), and full products list
        const data = {
            settings: (settings.results && settings.results.length) ? settings.results[0] : {},
            banners: banners.results || [],
            categories: categories.results || [],
            products: allProducts,
            product_chunks: product_chunks,
            master_meta: {
                total_products: allProducts.length,
                chunk_size: CHUNK_SIZE,
                total_chunks: product_chunks.length
            },
            home_sections: home_sections.results || [],
            product_categories: product_categories.results || [],
            tawk_widget_url: env.TAWK_WIDGET_URL || null,
            template_version: templateVersion,
            brand_colors: brandColors,
        };

        return new Response(JSON.stringify({ success: true, data }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
                // Caching is 100% controlled by Cloudflare Dashboard Cache Rules per domain (no hardcoded Cache-Control)
            }
        });
    } catch(e) {
        return Response.json({ success: false, error: e.message });
    }
}

