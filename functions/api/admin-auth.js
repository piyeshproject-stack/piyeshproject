// ============================================================
// functions/api/admin-auth.js
// Official credential check via Appwrite/Supabase Auth API
// Session token: HMAC signed with APPWRITE_API_KEY or SUPABASE_ANON_KEY
// No extra Cloudflare ENV vars needed beyond what's already set.
// ============================================================

import { getConfig } from '../utils/config.js';

const CORS = {
    'Content-Type':                 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── HMAC helpers (sign / verify) ─────────────────────────────
async function makeHmacToken(email, signingKey) {
    const payload = JSON.stringify({ email, exp: Date.now() + 86400000 }); // 24h
    const sig     = await hmacSign(payload, signingKey);
    return btoa(payload) + '.' + sig;
}

async function verifyHmacToken(token, signingKey) {
    try {
        const [b64, sig] = token.split('.');
        if (!b64 || !sig) return false;
        const payload  = atob(b64);
        const data     = JSON.parse(payload);
        if (Date.now() > data.exp) return false;
        const expected = await hmacSign(payload, signingKey);
        return sig === expected;
    } catch { return false; }
}

async function hmacSign(message, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
    const raw = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// ─────────────────────────────────────────────────────────────
export async function onRequest(context) {
    const { request } = context;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST')    return respond({ error: 'Method not allowed' }, 405);

    const config = getConfig(context.env);

    // Signing key = already-set API key (no new ENV vars needed)
    const SIGNING_KEY = config.DB_PROVIDER === 'appwrite'
        ? config.APPWRITE_API_KEY
        : config.SUPABASE_ANON_KEY;

    let body;
    try { body = await request.json(); }
    catch { return respond({ error: 'Invalid JSON' }, 400); }

    const { action } = body;

    // ── CHECK / LOGOUT — same for both providers ──────────────
    if (action === 'check') {
        const token = body.token || '';
        if (!token) return respond({ ok: false });
        const valid = await verifyHmacToken(token, SIGNING_KEY);
        return respond({ ok: valid });
    }

    if (action === 'logout') {
        return respond({ ok: true }); // frontend clears localStorage
    }

    // ── LOGIN ─────────────────────────────────────────────────
    if (action === 'login') {
        const { email, password } = body;

        let loginOk = false;
        let errorMsg = 'Login failed';

        if (config.DB_PROVIDER === 'appwrite') {
            // ── Appwrite official credential check ────────────
            const res = await fetch(`${config.APPWRITE_ENDPOINT}/account/sessions/email`, {
                method:  'POST',
                headers: {
                    'X-Appwrite-Project': config.APPWRITE_PROJECT,
                    'Content-Type':       'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                loginOk = true;
            } else {
                const data = await res.json().catch(() => ({}));
                errorMsg = data.message || 'Invalid email or password';
            }

        } else {
            // ── Supabase official credential check ────────────
            const res = await fetch(
                `${config.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method:  'POST',
                headers: {
                    'apikey':       config.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                loginOk = true;
            } else {
                const data = await res.json().catch(() => ({}));
                errorMsg = data.error_description || data.msg || 'Invalid email or password';
            }
        }

        if (!loginOk) return respond({ error: errorMsg }, 401);

        // ✅ Credentials verified — issue HMAC session token
        const token = await makeHmacToken(email, SIGNING_KEY);
        return respond({ ok: true, token, user: { email } });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
}

function respond(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
