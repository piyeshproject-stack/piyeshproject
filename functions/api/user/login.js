// ─────────────────────────────────────────────
// functions/api/user/login.js
// POST /api/user/login
// KV write: ZERO! (HMAC stateless token)
// ─────────────────────────────────────────────
import { ok, err, cors, verifyPassword, signToken, TTL } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, password } = await request.json();

        if (!email || !password) return err('email ও password দিন');

        const key = `user:${email.toLowerCase()}`;
        const raw = await env.USERS_KV.get(key);
        if (!raw) return err('Account পাওয়া যায়নি', 404);

        const user = JSON.parse(raw);

        // ── Verify password ──
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) return err('Password ভুল', 401);

        // ── Sign HMAC token — NO KV write! ──
        const token = await signToken(
            {
                sub: user.id,
                email: user.email,
                name: user.name,
                role: 'user',
                exp: Date.now() + TTL.USER_TOKEN,
            },
            env.JWT_SECRET || 'fallback-secret-change-this'
        );

        return ok({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
        });
    } catch (e) {
        return err(e.message, 500);
    }
}
