// ─────────────────────────────────────────────
// functions/api/mod/verify.js
// GET /api/mod/verify
// Check if moderator token is valid
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
        if (payload.role !== 'moderator') return err('Moderator access দরকার', 403);

        return ok({
            valid: true,
            mod: {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                permissions: payload.permissions,
            },
        });
    } catch (e) {
        return err(e.message, 500);
    }
}
