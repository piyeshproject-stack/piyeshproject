export async function onRequestGet(context) {
    const { request, env } = context;
    let response;
    try {
        const shopRequest = new Request(new URL('/shop', request.url), request);
        response = await env.ASSETS.fetch(shopRequest);

        if (!env.DB) return response;

        const url = new URL(request.url);
        const catId = url.searchParams.get('cat');
        const pSettings = env.DB.prepare("SELECT store_name, logo_url, favicon_url, seo_title, seo_description, seo_keywords, seo_og_image, site_url, footer_text FROM settings WHERE id = 1").first();
        
        let pCategory = null;
        if (catId) {
            pCategory = env.DB.prepare("SELECT name FROM categories WHERE id = ?").bind(catId).first();
        }

        let pProducts;
        if (catId) {
            pProducts = env.DB.prepare(`
                SELECT p.id, p.name, p.base_price, p.flash_sale_price, p.gallery_images, p.variants, p.sku
                FROM products p
                INNER JOIN product_categories pc ON p.id = pc.product_id
                WHERE p.is_active = 1 AND pc.category_id = ?
                ORDER BY p.is_featured DESC, p.created_at DESC
                LIMIT 100
            `).bind(catId).all();
        } else {
            pProducts = env.DB.prepare(`
                SELECT id, name, base_price, flash_sale_price, gallery_images, variants, sku
                FROM products
                WHERE is_active = 1
                ORDER BY is_featured DESC, created_at DESC
                LIMIT 100
            `).all();
        }

        const [settings, catObj, prodsRes] = await Promise.all([pSettings, pCategory, pProducts]);

        const storeName = settings?.store_name || "Store";
        let rawOrigin = (settings?.site_url || env.SITE_URL || url.origin).trim().replace(/\/+$/, '');
        if (rawOrigin && !rawOrigin.startsWith('http://') && !rawOrigin.startsWith('https://')) {
            rawOrigin = 'https://' + rawOrigin;
        }
        const origin = rawOrigin;

        const catName = catObj?.name || null;

        let title = catName ? `${catName} Collection — ${storeName}` : `Shop All Products — ${storeName}`;
        let desc = catName
            ? `Shop ${catName} online at ${storeName}. Best quality ${catName} products at the best price with fast delivery across Bangladesh.`
            : `Browse our complete collection of quality items on ${storeName}. Best prices, cash on delivery all over Bangladesh.`;
        const keywords = settings?.seo_keywords || `${storeName}, shop, ecommerce, online shopping bangladesh`;
        const products = prodsRes?.results || [];

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
                            ${p.flash_sale_price > 0 ? '<span class="product-badge badge-sale">SALE</span>' : ''}
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

        let canonicalUrl = `${origin}/shop${catId ? `?cat=${encodeURIComponent(catId)}` : ''}`;

        const shopJsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "CollectionPage",
                    "@id": canonicalUrl + "#collection",
                    "name": title,
                    "description": desc,
                    "url": canonicalUrl
                },
                ...(products.length > 0 ? [{
                    "@type": "ItemList",
                    "@id": canonicalUrl + "#items",
                    "itemListElement": products.map((p, idx) => ({
                        "@type": "ListItem",
                        "position": idx + 1,
                        "name": p.name,
                        "url": `${origin}/product?id=${encodeURIComponent(p.id)}`
                    }))
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
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeAttr(storeName)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta name="keywords" content="${escapeAttr(keywords)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    <script type="application/ld+json">${JSON.stringify(shopJsonLd)}</script>\n`;
                    e.append(headTags, { html: true });
                }
            });

        if (cardsHtml) {
            rewriter = rewriter.on('#productsGrid', {
                element(e) { e.setInnerContent(cardsHtml, { html: true }); }
            }).on('#resultCount', {
                element(e) { e.setInnerContent(`${products.length} products found`); }
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
