export async function onRequestGet(context) {
    const { request, env } = context;
    try {
        const prodRequest = new Request(new URL('/product', request.url), request);
        const response = await env.ASSETS.fetch(prodRequest);

        if (!env.DB) return response;

        const url = new URL(request.url);
        const pid = url.searchParams.get('id');
        if (!pid) return response;

        const pProduct = env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(pid).first();
        const pSettings = env.DB.prepare("SELECT store_name, logo_url, seo_og_image, seo_description, site_url FROM settings WHERE id = 1").first();
        const [product, settings] = await Promise.all([pProduct, pSettings]);

        if (!product) return response;

        const origin = (settings?.site_url || env.SITE_URL || url.origin).replace(/\/+$/, '');
        const storeName = settings?.store_name || "Online Store";
        const title = (product.seo_title && product.seo_title.trim())
            ? `${product.seo_title.trim()} — ${storeName}`
            : `${product.name} — ${storeName}`;

        let rawDesc = (product.seo_description || product.description || settings?.seo_description || "").replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        if (rawDesc.length > 160) rawDesc = rawDesc.substring(0, 157) + '...';
        const description = rawDesc || `Buy ${product.name} at best price from ${storeName}. Order online with Cash on Delivery!`;
        const keywords = product.tags || product.seo_keywords || settings?.seo_keywords || "";

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
        if (!imgUrl) imgUrl = settings?.seo_og_image || settings?.logo_url || "";
        if (imgUrl && !imgUrl.startsWith('http')) imgUrl = origin + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;

        const canonicalUrl = `${origin}/product?id=${encodeURIComponent(product.id)}`;
        const finalPrice = product.flash_sale_price > 0 ? (product.base_price - product.flash_sale_price) : product.base_price;

        const prodSchema = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Product",
                    "@id": canonicalUrl + "#product",
                    "name": product.name,
                    "image": imgUrl ? [imgUrl] : undefined,
                    "description": description,
                    "sku": product.sku || ('SKU-' + product.id),
                    "offers": {
                        "@type": "Offer",
                        "url": canonicalUrl,
                        "priceCurrency": "BDT",
                        "price": finalPrice,
                        "itemCondition": "https://schema.org/NewCondition",
                        "availability": product.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                        "seller": {
                            "@type": "Organization",
                            "name": storeName
                        }
                    }
                }
            ]
        };

        const transformed = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(title); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', description); } })
            .on('#navBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('#footerBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('head', {
                element(e) {
                    e.append(`\n    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="${escapeAttr(storeName)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta name="keywords" content="${escapeAttr(keywords)}">
    <meta property="og:image" content="${escapeAttr(imgUrl)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    <meta property="product:price:amount" content="${finalPrice}">
    <meta property="product:price:currency" content="BDT">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <meta name="twitter:image" content="${escapeAttr(imgUrl)}">
    <script type="application/ld+json">${JSON.stringify(prodSchema)}</script>\n`, { html: true });
                }
            })
            .transform(response);

        const headers = new Headers(transformed.headers);
        // Caching is 100% controlled by Cloudflare Dashboard Cache Rules per domain (no hardcoded Cache-Control)
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(transformed.body, {
            status: transformed.status,
            statusText: transformed.statusText,
            headers: headers
        });
    } catch(err) {
        return response;
    }
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
