export async function onRequestGet(context) {
    const { request, env } = context;
    let response;
    try {
        const prodRequest = new Request(new URL('/product', request.url), request);
        response = await env.ASSETS.fetch(prodRequest);

        if (!env.DB) return response;

        const url = new URL(request.url);
        const pid = url.searchParams.get('id');
        if (!pid) return response;

        const pProduct = env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(pid).first();
        const pSettings = env.DB.prepare("SELECT store_name, logo_url, seo_og_image, seo_description, seo_keywords, site_url FROM settings WHERE id = 1").first();
        const pReviews = env.DB.prepare("SELECT rating, customer_name, comment, created_at FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT 20").bind(pid).all().catch(() => ({ results: [] }));
        const pRelated = env.DB.prepare("SELECT id, name, base_price, flash_sale_price, gallery_images, variants FROM products WHERE is_active = 1 AND id != ? ORDER BY is_featured DESC, created_at DESC LIMIT 8").bind(pid).all().catch(() => ({ results: [] }));

        const [product, settings, reviewsRes, relatedRes] = await Promise.all([pProduct, pSettings, pReviews, pRelated]);

        if (!product) {
            const notFoundTransformed = new HTMLRewriter()
                .on('title', { element(e) { e.setInnerContent('Product Not Found'); } })
                .on('head', {
                    element(e) {
                        e.append('\n    <meta name="robots" content="noindex, nofollow">\n', { html: true });
                    }
                })
                .transform(response);
            const nfHeaders = new Headers(notFoundTransformed.headers);
            nfHeaders.set('Content-Type', 'text/html; charset=utf-8');
            return new Response(notFoundTransformed.body, {
                status: 404,
                headers: nfHeaders
            });
        }

        let rawOrigin = (settings?.site_url || env.SITE_URL || url.origin).trim().replace(/\/+$/, '');
        if (rawOrigin && !rawOrigin.startsWith('http://') && !rawOrigin.startsWith('https://')) {
            rawOrigin = 'https://' + rawOrigin;
        }
        const origin = rawOrigin;

        const storeName = settings?.store_name || "Online Store";
        const title = (product.seo_title && product.seo_title.trim())
            ? `${product.seo_title.trim()} — ${storeName}`
            : `${product.name} — ${storeName}`;

        const plainProductDesc = (product.description || "").replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        let rawDesc = (product.seo_description || plainProductDesc || settings?.seo_description || "").replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        if (rawDesc.length > 160) rawDesc = rawDesc.substring(0, 157) + '...';
        const description = rawDesc || `Buy ${product.name} at best price from ${storeName}. Order online with Cash on Delivery!`;
        const keywords = [product.name, product.sku, product.tags, product.seo_keywords, settings?.seo_keywords].filter(Boolean).join(', ');

        let allImages = [];
        try {
            const gallery = typeof product.gallery_images === 'string' ? JSON.parse(product.gallery_images) : (product.gallery_images || []);
            if (Array.isArray(gallery)) {
                gallery.forEach(u => {
                    if (u && typeof u === 'string') {
                        const full = u.startsWith('http') ? u : origin + (u.startsWith('/') ? '' : '/') + u;
                        if (!allImages.includes(full)) allImages.push(full);
                    }
                });
            }
        } catch(e) {}
        try {
            const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : (product.variants || []);
            if (Array.isArray(variants)) {
                variants.forEach(v => {
                    if (v && v.imageUrl) {
                        const full = v.imageUrl.startsWith('http') ? v.imageUrl : origin + (v.imageUrl.startsWith('/') ? '' : '/') + v.imageUrl;
                        if (!allImages.includes(full)) allImages.push(full);
                    }
                });
            }
        } catch(e) {}

        let imgUrl = allImages.length > 0 ? allImages[0] : (settings?.seo_og_image || settings?.logo_url || "");
        if (imgUrl && !imgUrl.startsWith('http')) imgUrl = origin + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;

        const canonicalUrl = `${origin}/product?id=${encodeURIComponent(product.id)}`;
        const finalPrice = product.flash_sale_price > 0 ? (product.base_price - product.flash_sale_price) : product.base_price;
        const reviews = reviewsRes?.results || [];
        const relatedProducts = relatedRes?.results || [];

        const productNode = {
            "@type": "Product",
            "@id": canonicalUrl + "#product",
            "name": product.name,
            "image": allImages.length > 0 ? allImages : (imgUrl ? [imgUrl] : undefined),
            "description": plainProductDesc || description,
            "sku": product.sku || ('SKU-' + product.id),
            "brand": {
                "@type": "Brand",
                "name": storeName
            },
            "offers": {
                "@type": "Offer",
                "url": canonicalUrl,
                "priceCurrency": "BDT",
                "price": finalPrice,
                "priceValidUntil": "2027-12-31",
                "itemCondition": "https://schema.org/NewCondition",
                "availability": product.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": storeName
                }
            }
        };

        if (reviews.length > 0) {
            let sum = 0;
            reviews.forEach(r => { sum += (parseInt(r.rating) || 5); });
            productNode.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": (sum / reviews.length).toFixed(1),
                "reviewCount": reviews.length
            };
        }

        const prodSchema = {
            "@context": "https://schema.org",
            "@graph": [
                productNode,
                {
                    "@type": "BreadcrumbList",
                    "@id": canonicalUrl + "#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": origin + "/"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Shop",
                            "item": origin + "/shop"
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": product.name,
                            "item": canonicalUrl
                        }
                    ]
                }
            ]
        };

        let relatedCardsHtml = '';
        if (relatedProducts.length > 0) {
            relatedCardsHtml = relatedProducts.map(rp => {
                let rVariants = [];
                try { rVariants = typeof rp.variants === 'string' ? JSON.parse(rp.variants) : (rp.variants || []); } catch(e) {}
                let rGallery = [];
                try { rGallery = typeof rp.gallery_images === 'string' ? JSON.parse(rp.gallery_images) : (rp.gallery_images || []); } catch(e) {}
                let rImg = (rVariants.length && rVariants[0]?.imageUrl) ? rVariants[0].imageUrl : (rGallery[0] || '');
                let rPrice = rp.flash_sale_price > 0 ? (rp.base_price - rp.flash_sale_price) : rp.base_price;
                return `<a href="/product?id=${encodeURIComponent(rp.id)}" class="product-card">
                    <div class="product-img-wrap">
                        ${rImg ? `<img src="${escapeAttr(rImg)}" alt="${escapeAttr(rp.name)}" loading="lazy">` : ''}
                    </div>
                    <div class="product-info">
                        <div class="product-name">${escapeAttr(rp.name)}</div>
                        <div class="product-price-row"><span class="product-price">৳${rPrice}</span></div>
                    </div>
                </a>`;
            }).join('');
        }

        const ssrDescHtml = (product.description && product.description.trim())
            ? product.description
            : `<p>${escapeAttr(description)}</p>`;

        let rewriter = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(title); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', description); } })
            .on('#navBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('#footerBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('#productPage', {
                element(e) {
                    e.setAttribute('style', 'display:grid;');
                }
            })
            .on('#breadcrumb', {
                element(e) {
                    e.setInnerContent(`<a href="/">Home</a> / <a href="/shop">Shop</a> / <span>${escapeAttr(product.name)}</span>`, { html: true });
                }
            })
            .on('#pName', {
                element(e) {
                    e.setInnerContent(product.name);
                }
            })
            .on('#currentPrice', {
                element(e) {
                    e.setInnerContent(`৳${finalPrice}`);
                }
            })
            .on('#stickyPrice', {
                element(e) {
                    e.setInnerContent(`৳${finalPrice}`);
                }
            })
            .on('#priceOld', {
                element(e) {
                    if (product.flash_sale_price > 0) {
                        e.setInnerContent(`৳${product.base_price}`);
                    }
                }
            })
            .on('#pSkuWrap', {
                element(e) {
                    if (product.sku) {
                        e.setAttribute('style', 'font-size:11px;color:#888;margin-bottom:12px;display:block;background:var(--bg-subtle);padding:3px 8px;border-radius:6px;width:fit-content;border:1px solid var(--border-light);');
                    }
                }
            })
            .on('#pSkuVal', {
                element(e) {
                    if (product.sku) e.setInnerContent(product.sku);
                }
            })
            .on('#mainImg', {
                element(e) {
                    if (imgUrl) e.setAttribute('src', imgUrl);
                    e.setAttribute('alt', product.name);
                }
            })
            .on('#pDesc', {
                element(e) {
                    e.setInnerContent(ssrDescHtml, { html: true });
                }
            })
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
                    e.append(`\n    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
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
            });

        if (relatedCardsHtml) {
            rewriter = rewriter
                .on('#relatedSection', { element(e) { e.setAttribute('style', 'margin-bottom:20px;display:block;'); } })
                .on('#relatedGrid', { element(e) { e.setInnerContent(relatedCardsHtml, { html: true }); } });
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
