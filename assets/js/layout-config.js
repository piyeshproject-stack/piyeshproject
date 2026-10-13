// Auto-synced during build from Cloudflare Env Var (TEMPLATE_VERSION)
window.THEME_LAYOUT = { 
    hero: (typeof CONFIG !== 'undefined' && CONFIG.TEMPLATE_VERSION) ? CONFIG.TEMPLATE_VERSION : 'v1' 
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
                var pairs = trimmed.replace(/:root\s*\{/, '').replace(/\}/, '').split(';');
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
