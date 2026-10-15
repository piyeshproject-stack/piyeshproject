export async function onRequestGet(context) {
    const { request, env } = context;
    try {
        const rootRequest = new Request(new URL('/', request.url), request);
        const response = await env.ASSETS.fetch(rootRequest);

        if (!env.DB) {
            return new Response("No DB binding", { status: 500 });
        }

        const pSettings = env.DB.prepare("SELECT store_name, logo_url, favicon_url, seo_title, seo_description, seo_keywords, seo_og_image, site_url, footer_text FROM settings WHERE id = 1").first();
        const pProducts = env.DB.prepare("SELECT id, name, base_price, flash_sale_price, gallery_images, variants, sku FROM products WHERE is_active = 1 ORDER BY is_featured DESC, created_at DESC LIMIT 16").all();

        const [settings, prodsRes] = await Promise.all([pSettings, pProducts]);

        const storeName = settings?.store_name || "Store";
        const origin = (settings?.site_url || env.SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
        const title = settings?.seo_title || `${storeName} — Online Shopping in Bangladesh`;
        const desc = settings?.seo_description || settings?.footer_text || `Welcome to ${storeName}. Best quality products, fastest delivery, and cash on delivery all over Bangladesh.`;
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
                return `<a href="product.html?id=${encodeURIComponent(p.id)}" class="product-card">
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

        let rewriter = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(title); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', desc); } })
            .on('#navBrand', { element(e) { e.setInnerContent(storeName); } })
            .on('#footerBrand', { element(e) { e.setInnerContent(storeName); } });

        if (cardsHtml) {
            rewriter = rewriter.on('#productsGrid', {
                element(e) { e.setInnerContent(cardsHtml, { html: true }); }
            });
        }

        return rewriter.transform(response);
    } catch(e) {
        return new Response("Error: " + e.message, { status: 500 });
    }
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
