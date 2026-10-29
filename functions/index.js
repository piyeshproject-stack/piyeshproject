export async function onRequestGet(context) {
    const { request, env } = context;
    let response;
    try {
        const rootRequest = new Request(new URL('/', request.url), request);
        response = await env.ASSETS.fetch(rootRequest);

        if (!env.DB) {
            return response;
        }

        const pSettings = env.DB.prepare("SELECT store_name, logo_url, favicon_url, seo_title, seo_description, seo_keywords, seo_og_image, site_url, footer_text FROM settings WHERE id = 1").first();
        const pProducts = env.DB.prepare("SELECT id, name, base_price, flash_sale_price, gallery_images, variants, sku FROM products WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC LIMIT 100").all();
        const pCategories = env.DB.prepare("SELECT id, name FROM categories WHERE is_active = 1").all().catch(() => ({ results: [] }));

        const [settings, prodsRes, catsRes] = await Promise.all([pSettings, pProducts, pCategories]);

        const storeName = settings?.store_name || "Store";
        let rawOrigin = (settings?.site_url || env.SITE_URL || new URL(request.url).origin).trim().replace(/\/+$/, '');
        if (rawOrigin && !rawOrigin.startsWith('http://') && !rawOrigin.startsWith('https://')) {
            rawOrigin = 'https://' + rawOrigin;
        }
        const origin = rawOrigin;

        const title = settings?.seo_title || `${storeName} — Online Shopping in Bangladesh`;
        const desc = settings?.seo_description || settings?.footer_text || `Welcome to ${storeName}. Best quality products, fastest delivery, and cash on delivery all over Bangladesh.`;
        const keywords = settings?.seo_keywords || `${storeName}, ecommerce, online shopping bangladesh`;
        const products = prodsRes?.results || [];
        const categories = catsRes?.results || [];

        let imgUrl = settings?.seo_og_image || settings?.logo_url || '';
        if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = origin + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
        }

        let catsHtml = '';
        if (categories.length > 0) {
            catsHtml = categories.map(c => `<a href="/shop?cat=${encodeURIComponent(c.id)}" class="cat-pill">${escapeAttr(c.name)}</a>`).join('');
        }

        let cardsHtml = '';
        if (products.length > 0) {
            cardsHtml = products.map(p => {
                let variants = [];
                try { variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []); } catch(e) {}
                let gallery = [];
                try { gallery = typeof p.gallery_images === 'string' ? JSON.parse(p.gallery_images) : (p.gallery_images || []); } catch(e) {}
                
                let img = (variants.length && variants[0]?.imageUrl) ? variants[0].imageUrl : (gallery[0] || '');
                let finalPrice = p.base_price;
                let saleHtml = '';
                if (p.flash_sale_price > 0) {
                    finalPrice = p.base_price - p.flash_sale_price;
                    saleHtml = `<span class="product-old-price">৳${p.base_price}</span>`;
                }
                return `<a href="/product?id=${encodeURIComponent(p.id)}" class="product-card">
                    <div class="product-img-wrap">
                        ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(p.name)}" loading="lazy">` : '<div style="height:200px;background:#f0f0f5;"></div>'}
                        <div class="product-badges">
                            ${p.flash_sale_price > 0 ? `<span class="product-badge badge-sale">৳${p.flash_sale_price} ছাড় (-${p.base_price > 0 ? Math.round((p.flash_sale_price / p.base_price) * 100) : 0}%)</span>` : ''}
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-name">${escapeAttr(p.name)}</div>
                        <div class="product-price-row">
                            <span class="product-price">৳${finalPrice}</span>${saleHtml}
                        </div>
                        <button class="product-add-btn">+ Add to Cart</button>
                    </div>
                </a>`;
            }).join('');
        }

        const itemListElements = products.map((p, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "name": p.name,
            "url": `${origin}/product?id=${encodeURIComponent(p.id)}`
        }));

        const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "@id": origin + "/#website",
                    "url": origin + "/",
                    "name": storeName,
                    "description": desc,
                    "potentialAction": [
                        {
                            "@type": "SearchAction",
                            "target": {
                                "@type": "EntryPoint",
                                "urlTemplate": origin + "/shop?search={search_term_string}"
                            },
                            "query-input": "required name=search_term_string"
                        }
                    ]
                },
                {
                    "@type": "OnlineStore",
                    "@id": origin + "/#organization",
                    "name": storeName,
                    "url": origin + "/",
                    "description": desc,
                    "image": imgUrl || undefined
                },
                ...(itemListElements.length > 0 ? [{
                    "@type": "ItemList",
                    "@id": origin + "/#products",
                    "name": `${storeName} Products`,
                    "itemListElement": itemListElements
                }] : [])
            ]
        };

        let rewriter = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(title); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', desc); } })
            .on('#navBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('#footerBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('a[href]', {
                element(e) {
                    const href = e.getAttribute('href');
                    if (!href) return;
                    if (href === 'index.html' || href === '/index.html') e.setAttribute('href', '/');
                    else if (href.startsWith('shop.html')) e.setAttribute('href', '/shop' + href.slice('shop.html'.length));
                    else if (href.startsWith('/shop.html')) e.setAttribute('href', '/shop' + href.slice('/shop.html'.length));
                    else if (href.startsWith('product.html')) e.setAttribute('href', '/product' + href.slice('product.html'.length));
                    else if (href.startsWith('/product.html')) e.setAttribute('href', '/product' + href.slice('/product.html'.length));
                    else if (href === 'policies.html' || href === '/policies.html') e.setAttribute('href', '/policies');
                    else if (href === 'team.html' || href === '/team.html') e.setAttribute('href', '/team');
                    else if (href === 'track.html' || href === '/track.html') e.setAttribute('href', '/track');
                }
            })
            .on('head', {
                element(e) {
                    let headTags = `\n    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${escapeAttr(origin)}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeAttr(storeName)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta property="og:url" content="${escapeAttr(origin)}/">`;
                    if (keywords) headTags += `\n    <meta name="keywords" content="${escapeAttr(keywords)}">`;
                    if (imgUrl) {
                        headTags += `\n    <meta property="og:image" content="${escapeAttr(imgUrl)}">
    <meta name="twitter:image" content="${escapeAttr(imgUrl)}">`;
                    }
                    headTags += `\n    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(desc)}">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`;
                    e.append(headTags, { html: true });
                }
            });

        if (catsHtml) {
            rewriter = rewriter.on('#catRow', {
                element(e) { e.setInnerContent(catsHtml, { html: true }); }
            });
        }

        if (cardsHtml) {
            rewriter = rewriter.on('#productsGrid', {
                element(e) { e.setInnerContent(cardsHtml, { html: true }); }
            });
        }

        const transformed = rewriter.transform(response);
        const headers = new Headers(transformed.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(transformed.body, {
            status: transformed.status,
            statusText: transformed.statusText,
            headers: headers
        });
    } catch(err) {
        return response || new Response('Internal Server Error', { status: 500 });
    }
}

function escapeAttr(str) {
    return (str || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
