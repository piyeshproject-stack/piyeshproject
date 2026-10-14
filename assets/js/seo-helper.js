// ============================================================
// SEO & Meta Tag Management Engine
// Fully dynamic, multi-tenant & client-agnostic
// ============================================================

window.SEO = (function() {
    // Determine the base site URL (dynamic fallback to current origin)
    function getSiteUrl(settings) {
        if (settings && settings.site_url && settings.site_url.trim()) {
            return settings.site_url.trim().replace(/\/+$/, '');
        }
        if (typeof CONFIG !== 'undefined' && CONFIG.SITE_URL && CONFIG.SITE_URL.trim()) {
            return CONFIG.SITE_URL.trim().replace(/\/+$/, '');
        }
        return window.location.origin.replace(/\/+$/, '');
    }

    // Set or create a <meta> tag
    function setMeta(key, value, isProperty) {
        if (value === undefined || value === null) return;
        var attr = isProperty ? 'property' : 'name';
        var el = document.querySelector('meta[' + attr + '="' + key + '"]');
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', value);
    }

    // Set or create a canonical <link>
    function setCanonical(url) {
        if (!url) return;
        var link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        link.setAttribute('href', url);
    }

    // Set or create a JSON-LD structured data script
    function setJsonLd(id, data) {
        if (!data) return;
        var scriptId = 'jsonld-' + id;
        var el = document.getElementById(scriptId);
        if (!el) {
            el = document.createElement('script');
            el.id = scriptId;
            el.type = 'application/ld+json';
            document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(data);
    }

    // Strip HTML tags for clean plain-text description
    function stripHtml(html) {
        if (!html) return '';
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var txt = tmp.textContent || tmp.innerText || '';
        return txt.replace(/\s+/g, ' ').trim();
    }

    // Apply General SEO for any page
    function applyPageSEO(opts) {
        opts = opts || {};
        var settings = opts.settings || {};
        var siteUrl = getSiteUrl(settings);
        var storeName = settings.store_name || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : '') || 'Store';

        // 1. Robots
        if (opts.noindex) {
            setMeta('robots', 'noindex, nofollow');
        } else {
            setMeta('robots', 'index, follow, max-image-preview:large');
        }

        // 2. Title & Descriptions
        var title = opts.title || settings.seo_title || (storeName + ' — Online Shopping');
        document.title = title;

        var desc = opts.description || settings.seo_description || settings.footer_text || ('Shop online at ' + storeName + ' for best quality products at unbeatable prices.');
        setMeta('description', desc);

        var keywords = opts.keywords || settings.seo_keywords || '';
        if (keywords) setMeta('keywords', keywords);

        // Google Site Verification
        if (settings.google_site_verification) {
            setMeta('google-site-verification', settings.google_site_verification);
        }

        // 3. Canonical URL
        var pageUrl = opts.url || (siteUrl + window.location.pathname + (window.location.search || ''));
        setCanonical(pageUrl);

        // 4. Open Graph (Facebook, WhatsApp, LinkedIn, etc.)
        setMeta('og:type', opts.type || 'website', true);
        setMeta('og:site_name', storeName, true);
        setMeta('og:title', title, true);
        setMeta('og:description', desc, true);
        setMeta('og:url', pageUrl, true);
        
        var imgUrl = opts.image || settings.seo_og_image || settings.logo_url || '';
        if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = siteUrl + (imgUrl.startsWith('/') ? '' : '/') + imgUrl;
        }
        if (imgUrl) {
            setMeta('og:image', imgUrl, true);
            setMeta('twitter:image', imgUrl);
        }

        // 5. Twitter Cards
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', title);
        setMeta('twitter:description', desc);

        // 6. JSON-LD Structured Data
        if (opts.jsonLd) {
            setJsonLd(opts.jsonLdId || 'page', opts.jsonLd);
        }
    }

    // Homepage SEO with WebSite & Store/Organization schema
    function applyHomeSEO(settings) {
        settings = settings || {};
        var siteUrl = getSiteUrl(settings);
        var storeName = settings.store_name || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : '') || 'Store';

        var title = settings.seo_title || (storeName + ' — Online Shopping in Bangladesh');
        var desc = settings.seo_description || settings.footer_text || ('Welcome to ' + storeName + '. Best quality products, fastest delivery, and cash on delivery all over Bangladesh.');
        var img = settings.seo_og_image || settings.logo_url || '';

        var jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "@id": siteUrl + "/#website",
                    "url": siteUrl,
                    "name": storeName,
                    "description": desc,
                    "potentialAction": [
                        {
                            "@type": "SearchAction",
                            "target": {
                                "@type": "EntryPoint",
                                "urlTemplate": siteUrl + "/shop.html?search={search_term_string}"
                            },
                            "query-input": "required name=search_term_string"
                        }
                    ]
                },
                {
                    "@type": "OnlineStore",
                    "@id": siteUrl + "/#organization",
                    "name": storeName,
                    "url": siteUrl,
                    "logo": img ? (img.startsWith('http') ? img : siteUrl + '/' + img) : undefined,
                    "description": desc,
                    "telephone": settings.whatsapp_number ? ('+88' + settings.whatsapp_number.replace(/^88/, '')) : undefined,
                    "sameAs": [
                        settings.facebook_url,
                        settings.instagram_url,
                        settings.youtube_url
                    ].filter(Boolean)
                }
            ]
        };

        applyPageSEO({
            settings: settings,
            title: title,
            description: desc,
            keywords: settings.seo_keywords,
            image: img,
            url: siteUrl + '/',
            type: 'website',
            jsonLd: jsonLd,
            jsonLdId: 'website'
        });
    }

    // Product Detail Page SEO with Product Schema
    function applyProductSEO(product, settings, reviews) {
        if (!product) return;
        settings = settings || {};
        var siteUrl = getSiteUrl(settings);
        var storeName = settings.store_name || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : '') || 'Store';

        var title = product.name + ' — ' + storeName;
        var rawDesc = stripHtml(product.description);
        var desc = rawDesc ? (rawDesc.length > 160 ? rawDesc.substring(0, 157) + '...' : rawDesc) : ('Buy ' + product.name + ' at best price online from ' + storeName + '. Cash on delivery available.');

        // Image priority: gallery_images[0] -> variants[0].imageUrl -> settings.seo_og_image -> settings.logo_url
        var img = '';
        var gallery = Array.isArray(product.gallery_images) ? product.gallery_images : [];
        if (gallery.length > 0 && gallery[0]) {
            img = gallery[0];
        } else if (Array.isArray(product.variants) && product.variants.length > 0 && product.variants[0].imageUrl) {
            img = product.variants[0].imageUrl;
        } else {
            img = settings.seo_og_image || settings.logo_url || '';
        }
        if (img && !img.startsWith('http')) {
            img = siteUrl + (img.startsWith('/') ? '' : '/') + img;
        }

        var prodUrl = siteUrl + '/product.html?id=' + encodeURIComponent(product.id);
        var finalPrice = (product.flash_sale_price > 0) ? (product.base_price - product.flash_sale_price) : (product.base_price || 0);

        // Product Schema
        var prodSchema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": img ? [img] : undefined,
            "description": desc,
            "sku": product.sku || ('SKU-' + product.id),
            "offers": {
                "@type": "Offer",
                "url": prodUrl,
                "priceCurrency": "BDT",
                "price": finalPrice,
                "itemCondition": "https://schema.org/NewCondition",
                "availability": product.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": storeName
                }
            }
        };

        // Aggregate Rating if reviews exist
        if (Array.isArray(reviews) && reviews.length > 0) {
            var sum = 0;
            reviews.forEach(function(r) { sum += (parseInt(r.rating) || 5); });
            var avg = (sum / reviews.length).toFixed(1);
            prodSchema.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": avg,
                "reviewCount": reviews.length
            };
        }

        applyPageSEO({
            settings: settings,
            title: title,
            description: desc,
            keywords: (settings.seo_keywords ? settings.seo_keywords + ', ' : '') + product.name,
            image: img,
            url: prodUrl,
            type: 'product',
            jsonLd: prodSchema,
            jsonLdId: 'product'
        });

        // Add product price OG meta
        setMeta('product:price:amount', finalPrice, true);
        setMeta('product:price:currency', 'BDT', true);
    }

    // Shop Catalog Page SEO
    function applyShopSEO(settings, catName, searchTerm) {
        settings = settings || {};
        var siteUrl = getSiteUrl(settings);
        var storeName = settings.store_name || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : '') || 'Store';

        var title = 'Shop All Products — ' + storeName;
        if (catName) title = catName + ' Collection — ' + storeName;
        else if (searchTerm) title = 'Search: ' + searchTerm + ' — ' + storeName;

        var desc = 'Browse our complete catalog of quality items on ' + storeName + '. Enjoy fast shipping and secure cash on delivery.';
        var pageUrl = siteUrl + '/shop.html' + (window.location.search || '');

        var jsonLd = {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": title,
            "description": desc,
            "url": pageUrl
        };

        applyPageSEO({
            settings: settings,
            title: title,
            description: desc,
            keywords: settings.seo_keywords,
            image: settings.seo_og_image || settings.logo_url,
            url: pageUrl,
            type: 'website',
            jsonLd: jsonLd,
            jsonLdId: 'shop'
        });
    }

    return {
        getSiteUrl: getSiteUrl,
        setMeta: setMeta,
        setCanonical: setCanonical,
        setJsonLd: setJsonLd,
        applyPageSEO: applyPageSEO,
        applyHomeSEO: applyHomeSEO,
        applyProductSEO: applyProductSEO,
        applyShopSEO: applyShopSEO
    };
})();
