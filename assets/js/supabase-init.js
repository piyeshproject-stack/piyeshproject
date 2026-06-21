// ============================================================
// assets/js/supabase-init.js
// Initialize Supabase Client (For Admin Panel)
// ============================================================

// Initialize window.supabase
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Inject custom headers (for auth) into global fetch
    // Supabase JS v2 uses global fetch. We intercept it to inject the admin token.
    var _originalFetch = window.fetch;
    window.fetch = async function() {
        var args = Array.prototype.slice.call(arguments);
        var url = args[0];
        if (typeof url === 'string' && url.startsWith(CONFIG.SUPABASE_URL)) {
            var opts = args[1] || {};
            opts.headers = opts.headers || {};
            var token = localStorage.getItem('fbr_admin_token');
            if (token) {
                opts.headers['Authorization'] = 'Bearer ' + token;
            }
            args[1] = opts;
        }
        return _originalFetch.apply(this, args);
    };
}
