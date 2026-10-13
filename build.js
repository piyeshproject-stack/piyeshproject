const fs = require('fs');
const path = require('path');

const s = (val) => (val || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// ── Template / Site Version from Cloudflare Env Var (v1 বা v2) ──
const rawVersion = (process.env.TEMPLATE_VERSION || process.env.VERSION || process.env.SITE_VERSION || process.env.THEME_VERSION || 'v1').toString().trim().toLowerCase();
const templateVersion = (rawVersion === 'v2' || rawVersion === '2') ? 'v2' : 'v1';

const configJs = `// ============================================================
// Auto-generated during Cloudflare Build
// ============================================================

var CONFIG = {
    // ── Template / Site Version (Cloudflare Env Var: v1 বা v2) ──
    TEMPLATE_VERSION: '${templateVersion}',

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

// Sync layout-config.js with active version
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
`;
fs.writeFileSync(layoutConfigPath, layoutConfigJs, 'utf8');
console.log('✅ assets/js/layout-config.js synced successfully during build!');

// Clean up old _redirects if needed (disabled to avoid dirty git status)

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
