const fs = require('fs');
const path = require('path');

const s = (val) => (val || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// ── Template / Site Version from Cloudflare Env Var (v1 বা v2) ──
const rawVersion = (process.env.TEMPLATE_VERSION || process.env.VERSION || process.env.SITE_VERSION || process.env.THEME_VERSION || 'v1').toString().trim().toLowerCase();
const templateVersion = (rawVersion === 'v2' || rawVersion === '2') ? 'v2' : 'v1';

// ── Brand Colors from Cloudflare Env Var (BRAND_COLORS বা THEME_COLORS) ──
const rawBrandColors = (process.env.BRAND_COLORS || process.env.THEME_COLORS || process.env.THEME_CSS || '').toString().trim();

// ── Site Canonical URL from Cloudflare Env Var (SITE_URL বা CANONICAL_URL) ──
const rawSiteUrl = (process.env.SITE_URL || process.env.CANONICAL_URL || '').toString().trim();

const configJs = `// ============================================================
// Auto-generated during Cloudflare Build
// ============================================================

var CONFIG = {
    // ── Template / Site Version (Cloudflare Env Var: v1 বা v2) ──
    TEMPLATE_VERSION: '${templateVersion}',

    // ── Store Brand Colors (Cloudflare Env Var: BRAND_COLORS) ──
    BRAND_COLORS: '${s(rawBrandColors)}',

    // ── Canonical / Base Site URL (Cloudflare Env Var: SITE_URL) ──
    SITE_URL: '${s(rawSiteUrl)}',

    // ── DB Provider ──────────────────────────────────────────
    DB_PROVIDER: '${s(process.env.DB_PROVIDER) || 'cf_db'}',
    
    HF_API_BASE: '',

    // ── Supabase ─────────────────────────────────────────────
    SUPABASE_URL:      '${s(process.env.SUPABASE_URL)}',
    SUPABASE_ANON_KEY: '${s(process.env.SUPABASE_ANON_KEY)}',

    // ── Appwrite ─────────────────────────────────────────────
    APPWRITE_ENDPOINT:    '${s(process.env.APPWRITE_ENDPOINT)}',
    APPWRITE_PROJECT:     '${s(process.env.APPWRITE_PROJECT)}',
    APPWRITE_DATABASE_ID: '${s(process.env.APPWRITE_DATABASE_ID)}',

    // (Tokens are securely hidden in the Hugging Face backend)

    // ── Maintenance Mode (Cloudflare Env Var দিয়ে নিয়ন্ত্রণ) ──
    MAINTENANCE_MODE:    ${process.env.MAINTENANCE_MODE === 'true' ? 'true' : 'false'},
    MAINTENANCE_MESSAGE: '${s(process.env.MAINTENANCE_MESSAGE) || 'আমরা শীঘ্রই ফিরে আসছি। কিছু technical কাজ চলছে।'}',

    // ── Frontend Constants ───────────────────────────────────
    CART_KEY:         'fbr_cart',
    DIRECT_ORDER_KEY: 'fbr_direct_order',
    SESSION_KEY:      'fbr_session',
    ADMIN_PATH:       '/admin',
};
`;

const configPath = path.join(__dirname, 'assets', 'js', 'config.js');
fs.writeFileSync(configPath, configJs, 'utf8');
console.log('✅ assets/js/config.js generated successfully during build with TEMPLATE_VERSION: ' + templateVersion);

// If BRAND_COLORS provided during build, statically sync assets/css/theme.css
if (rawBrandColors) {
    try {
        let colors = null;
        if (rawBrandColors.startsWith('{')) {
            colors = JSON.parse(rawBrandColors);
        }
        if (colors && typeof colors === 'object') {
            const cssTheme = `:root { --primary: ${colors.primary || '#8b1a1a'}; --primary-light: ${colors.primary_light || '#b03535'}; --primary-dark: ${colors.primary_dark || '#680000'}; --bg: ${colors.bg || '#ffffff'}; --bg-light: ${colors.bg_light || '#fbf8f7'}; --bg-card: ${colors.bg_card || '#ffffff'}; --bg-subtle: ${colors.bg_subtle || '#f7f2f2'}; --footer-bg: ${colors.footer_bg || '#1a0808'}; --border: ${colors.border || '#e4d8d8'}; --border-light: ${colors.border_light || '#f0eaea'}; --text-dark: ${colors.text_dark || '#1a0808'}; --text-body: ${colors.text_body || '#3d2a2a'}; --text-muted: ${colors.text_muted || '#9e7070'}; }\n`;
            fs.writeFileSync(path.join(__dirname, 'assets', 'css', 'theme.css'), cssTheme, 'utf8');
            console.log('✅ assets/css/theme.css synced from BRAND_COLORS environment variable!');
        }
    } catch(e) {
        console.warn('Could not parse BRAND_COLORS during build:', e.message);
    }
}

// Sync layout-config.js with active version and dynamic brand color engine
const layoutConfigPath = path.join(__dirname, 'assets', 'js', 'layout-config.js');
const layoutConfigJs = `// Auto-synced during build from Cloudflare Env Var (TEMPLATE_VERSION)
window.THEME_LAYOUT = { 
    hero: (typeof CONFIG !== 'undefined' && CONFIG.TEMPLATE_VERSION) ? CONFIG.TEMPLATE_VERSION : '${templateVersion}' 
};

window.initTawkTo = function(url) {
    if (!url || window.Tawk_API) return;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = url;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin","*");
    s0.parentNode.insertBefore(s1,s0);
};

// ── Dynamic Brand Color Engine (Cloudflare Variable: BRAND_COLORS) ──
window.applyBrandColors = function(raw) {
    if (!raw) return;
    try {
        var colors = null;
        if (typeof raw === 'object') {
            colors = raw;
        } else if (typeof raw === 'string') {
            var trimmed = raw.trim();
            if (trimmed.startsWith('{')) {
                colors = JSON.parse(trimmed);
            } else if (trimmed.includes(':') || trimmed.includes('--')) {
                var map = {};
                var pairs = trimmed.replace(/:root\\s*\\{/, '').replace(/\\}/, '').split(';');
                pairs.forEach(function(pair) {
                    var parts = pair.split(':');
                    if (parts.length === 2) {
                        var k = parts[0].trim().replace(/^--/, '').replace(/-/g, '_');
                        map[k] = parts[1].trim();
                    }
                });
                if (Object.keys(map).length > 0) colors = map;
            }
        }

        if (!colors) return;

        var root = document.documentElement;
        var styleRules = [];

        var mapping = {
            'primary': '--primary',
            'primary_light': '--primary-light',
            'primaryLight': '--primary-light',
            'primary_dark': '--primary-dark',
            'primaryDark': '--primary-dark',
            'bg': '--bg',
            'bg_light': '--bg-light',
            'bgLight': '--bg-light',
            'bg_card': '--bg-card',
            'bgCard': '--bg-card',
            'bg_subtle': '--bg-subtle',
            'bgSubtle': '--bg-subtle',
            'footer_bg': '--footer-bg',
            'footerBg': '--footer-bg',
            'border': '--border',
            'border_light': '--border-light',
            'borderLight': '--border-light',
            'text_dark': '--text-dark',
            'textDark': '--text-dark',
            'text_body': '--text-body',
            'textBody': '--text-body',
            'text_muted': '--text-muted',
            'textMuted': '--text-muted'
        };

        for (var key in colors) {
            if (colors.hasOwnProperty(key)) {
                var cssVar = mapping[key] || ('--' + key.replace(/_/g, '-'));
                var val = colors[key];
                if (val && typeof val === 'string') {
                    root.style.setProperty(cssVar, val);
                    styleRules.push(cssVar + ': ' + val + ' !important;');
                }
            }
        }

        var styleTag = document.getElementById('dynamic-brand-colors');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-brand-colors';
            document.head.appendChild(styleTag);
        }
        if (styleRules.length > 0) {
            styleTag.textContent = ':root { ' + styleRules.join(' ') + ' }';
        }

        try {
            localStorage.setItem('fbr_brand_colors', typeof raw === 'string' ? raw : JSON.stringify(colors));
        } catch(e) {}

        if (typeof setDynamicContrast === 'function') {
            setDynamicContrast();
        }
    } catch(err) {
        console.warn('applyBrandColors error:', err);
    }
};

// Auto-run on load from CONFIG or localStorage cache
try {
    if (typeof CONFIG !== 'undefined' && CONFIG.BRAND_COLORS) {
        window.applyBrandColors(CONFIG.BRAND_COLORS);
    } else {
        var cachedBrand = localStorage.getItem('fbr_brand_colors');
        if (cachedBrand) window.applyBrandColors(cachedBrand);
    }
} catch(e) {}
`;
fs.writeFileSync(layoutConfigPath, layoutConfigJs, 'utf8');
console.log('✅ assets/js/layout-config.js synced successfully during build!');

// ── Cache Busting for HTML files ──
const timestamp = Date.now();
const directories = [__dirname, path.join(__dirname, 'admin')];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            const updatedContent = content.replace(/assets\/js\/config\.js\?v=\d+/g, `assets/js/config.js?v=${timestamp}`);
            if (content !== updatedContent) {
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`✅ Cache busted config.js in ${file}`);
            }
        }
    });
});

// ── Pre-render public data into index.html for instant first paint and 100% Googlebot indexability ──
try {
    const pubDataPath = path.join(__dirname, 'public_data.json');
    if (fs.existsSync(pubDataPath)) {
        let pubRaw = fs.readFileSync(pubDataPath, 'utf8');
        if (pubRaw.charCodeAt(0) === 0xFEFF) pubRaw = pubRaw.slice(1);
        const pubJson = JSON.parse(pubRaw);
        const pubData = pubJson.data || pubJson;
        
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            let indexHtml = fs.readFileSync(indexPath, 'utf8');
            
            const storeName = pubData.settings?.store_name || 'RENONEX';
            const seoTitle = pubData.settings?.seo_title || (storeName + ' — Online Shopping in Bangladesh');
            const seoDesc = pubData.settings?.seo_description || 'Best quality products at the best prices. Order online with Cash on Delivery.';

            // Replace title & description
            indexHtml = indexHtml.replace(/<title>.*?<\/title>/i, `<title>${seoTitle}</title>`);
            indexHtml = indexHtml.replace(/<meta name="description" content=".*?">/i, `<meta name="description" content="${seoDesc.replace(/"/g, '&quot;')}">`);
            
            // Replace nav brand & storeName initial text
            indexHtml = indexHtml.replace(/<span id="navBrand">.*?<\/span>/i, `<span id="navBrand">${storeName}</span>`);
            indexHtml = indexHtml.replace(/id="storeName">.*?<\/div>/i, `id="storeName">${storeName}</div>`);
            
            // Pre-render product cards into #productsGrid
            if (Array.isArray(pubData.products) && pubData.products.length > 0) {
                const cardsHtml = pubData.products.map(p => {
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
                    return `<a href="product.html?id=${p.id}" class="product-card">
                        <div class="product-img-wrap">
                            ${img ? `<img src="${img}" alt="${p.name}" loading="lazy">` : '<div style="height:200px;background:#f0f0f5;"></div>'}
                            <div class="product-badges">
                                ${p.flash_sale_price > 0 ? '<span class="product-badge badge-sale">SALE</span>' : ''}
                            </div>
                        </div>
                        <div class="product-info">
                            <div class="product-name">${p.name}</div>
                            <div class="product-price-row">
                                <span class="product-price">৳${finalPrice}</span>${saleHtml}
                            </div>
                            <button class="product-add-btn">+ Add to Cart</button>
                        </div>
                    </a>`;
                }).join('');
                
                // Replace fallback "No products yet" inside #productsGrid
                indexHtml = indexHtml.replace(/<div class="products-grid" id="productsGrid">[\s\S]*?<\/div>\s*<\/section>/i, `<div class="products-grid" id="productsGrid">${cardsHtml}</div>\n        </section>`);
            }
            
            // Inject script __INITIAL_DATA__ right before closing </body>
            const initialDataScript = `<script id="__INITIAL_DATA__" type="application/json">${JSON.stringify(pubData)}</script>`;
            if (!indexHtml.includes('id="__INITIAL_DATA__"')) {
                indexHtml = indexHtml.replace('</body>', `${initialDataScript}\n</body>`);
            } else {
                indexHtml = indexHtml.replace(/<script id="__INITIAL_DATA__" type="application\/json">[\s\S]*?<\/script>/, initialDataScript);
            }
            
            fs.writeFileSync(indexPath, indexHtml, 'utf8');
            console.log('✅ Successfully pre-rendered products and initial data into index.html!');
        }
    }
} catch(err) {
    console.warn('Pre-rendering warning:', err.message);
}

