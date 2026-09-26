// ─────────────────────────────────────────────
// functions/api/user/orders.js
// GET /api/user/orders
// D1 read only — user এর orders by phone
// KV write: ZERO
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

        // ── Get user's phone from KV ──
        const raw = await env.USERS_KV.get(`user:${payload.email}`);
        if (!raw) return err('Account পাওয়া যায়নি', 404);
        const user = JSON.parse(raw);

        // ── D1 read only — find orders by phone ──
        const { results } = await env.DB.prepare(
            `SELECT id, status, payment_status, payment_method, grand_total, 
                    items, created_at, district, division
             FROM orders 
             WHERE customer_phone = ? 
             ORDER BY created_at DESC 
             LIMIT 50`
        ).bind(user.phone).all();

        return ok({ orders: results });
    } catch (e) {
        return err(e.message, 500);
    }
}
