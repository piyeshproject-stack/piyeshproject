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
        const INITIAL_LIMIT = 20;
        const CHUNK_SIZE = 100;

        const url = new URL(context.request.url);
        const chunkParam = url.searchParams.get("chunk");
        const singlePid = url.searchParams.get("product_id");
        const loadAll = url.searchParams.get("all") === "1";

        // 1. Single product lookup (for product page direct access)
        if (singlePid) {
            const found = allProducts.find(p => String(p.id) === String(singlePid));
            return new Response(JSON.stringify({
                success: true,
                product: found || null,
                settings: (settings.results && settings.results.length) ? settings.results[0] : {},
                categories: categories.results || [],
                product_categories: product_categories.results || []
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // 2. Subsequent 100-product chunks (?chunk=1, ?chunk=2, etc.)
        if (chunkParam) {
            const chunkNum = Math.max(1, parseInt(chunkParam, 10) || 1);
            // Chunk 1 starts after initial 20 products: offset = 20 + (chunkNum - 1) * 100
            const offset = INITIAL_LIMIT + (chunkNum - 1) * CHUNK_SIZE;
            const chunkProducts = allProducts.slice(offset, offset + CHUNK_SIZE);
            const hasMore = (offset + CHUNK_SIZE) < allProducts.length;

            return new Response(JSON.stringify({
                success: true,
                chunk: chunkNum,
                count: chunkProducts.length,
                total_products: allProducts.length,
                has_more: hasMore,
                next_chunk: hasMore ? (chunkNum + 1) : null,
                products: chunkProducts
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // 3. Initial load: Banners + Settings + Categories + First 20 products (Instant render)
        const initialProducts = loadAll ? allProducts : allProducts.slice(0, INITIAL_LIMIT);
        const remainingCount = Math.max(0, allProducts.length - INITIAL_LIMIT);
        const totalChunks = Math.ceil(remainingCount / CHUNK_SIZE);
        const hasMore = allProducts.length > INITIAL_LIMIT && !loadAll;

        const data = {
            settings: (settings.results && settings.results.length) ? settings.results[0] : {},
            banners: banners.results || [],
            categories: categories.results || [],
            products: initialProducts,
            has_more: hasMore,
            next_chunk: hasMore ? 1 : null,
            total_products: allProducts.length,
            initial_count: initialProducts.length,
            chunk_size: CHUNK_SIZE,
            total_chunks: totalChunks,
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
            }
        });
    } catch(e) {
        return Response.json({ success: false, error: e.message });
    }
}

