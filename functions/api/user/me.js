// ─────────────────────────────────────────────
// functions/api/user/me.js
// GET /api/user/me
// KV read: 1 (fetch profile) — no write
// ─────────────────────────────────────────────
import { ok, err, cors, verifyToken, getBearerToken } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        const token = getBearerToken(request);
        if (!token) return err('Token দিন', 401);

        const payload = await verifyToken(token, env.JWT_SECRET || 'fallback-secret-change-this');
        if (!payload) return err('Token invalid বা মেয়াদ শেষ', 401);

        // ── Fetch latest profile from KV ──
        const raw = await env.USERS_KV.get(`user:${payload.email}`);
        if (!raw) return err('Account পাওয়া যায়নি', 404);

        const user = JSON.parse(raw);
        // Remove sensitive data
        const { password_hash, ...profile } = user;

        return ok({ user: profile });
    } catch (e) {
        return err(e.message, 500);
    }
}
