export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pid = url.searchParams.get('id');

    // 1. Fetch static HTML asset
    const prodRequest = new Request(new URL('/product.html', request.url), request);
    const response = await env.ASSETS.fetch(prodRequest);

    // If no product ID or no DB binding, return asset directly
    if (!pid || !env.DB) {
        return response;
    }

    try {
        // Query product and settings in parallel
        const pProduct = env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(pid).first();
        const pSettings = env.DB.prepare("SELECT store_name, logo_url, seo_og_image, seo_description, site_url FROM settings WHERE id = 1").first();
        const [product, settings] = await Promise.all([pProduct, pSettings]);

        if (!product) {
            return response;
        }

        const origin = (settings?.site_url || env.SITE_URL || url.origin).replace(/\/+$/, '');
        const storeName = settings?.store_name || "Online Store";
        const title = `${product.name} — ${storeName}`;
        
        // Strip HTML tags for clean meta description
        let rawDesc = (product.description || settings?.seo_description || "").replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        if (rawDesc.length > 160) {
            rawDesc = rawDesc.substring(0, 157) + '...';
        }
        const description = rawDesc || `Buy ${product.name} at best price from ${storeName}. Order online with Cash on Delivery!`;

        // Image priority: gallery_images[0] -> variants[0].imageUrl -> settings.seo_og_image -> settings.logo_url
        let imgUrl = "";
        try {
            const gallery = typeof product.gallery_images === 'string' ? JSON.parse(product.gallery_images) : (product.gallery_images || []);
            if (Array.isArray(gallery) && gallery.length > 0 && gallery[0]) imgUrl = gallery[0];
        } catch(e) {}
        if (!imgUrl) {
            try {
                const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : (product.variants || []);
                if (Array.isArray(variants) && variants.length > 0 && variants[0]?.imageUrl) imgUrl = variants[0].imageUrl;
            } catch(e) {}
        }
        if (!imgUrl) {
            imgUrl = settings?.seo_og_image || settings?.logo_url || "";
        }
        // Make image absolute if relative
        if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = origin + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
        }

        const canonicalUrl = `${origin}/product.html?id=${encodeURIComponent(product.id)}`;
        const finalPrice = product.flash_sale_price > 0 ? (product.base_price - product.flash_sale_price) : product.base_price;

        // Use HTMLRewriter to stream-inject meta tags into <head>
        return new HTMLRewriter()
            .on('title', {
                element(e) { e.setInnerContent(title); }
            })
            .on('head', {
                element(e) {
                    e.append(`\n    <!-- Server-Side SEO & Social Sharing (Cloudflare Edge Prerender) -->
    <meta name="description" content="${escapeAttr(description)}">
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="${escapeAttr(storeName)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:image" content="${escapeAttr(imgUrl)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    <meta property="product:price:amount" content="${finalPrice}">
    <meta property="product:price:currency" content="BDT">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <meta name="twitter:image" content="${escapeAttr(imgUrl)}">\n`, { html: true });
                }
            })
            .transform(response);
    } catch(err) {
        // Fallback gracefully on any error
        return response;
    }
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
