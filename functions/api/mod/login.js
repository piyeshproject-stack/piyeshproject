// ─────────────────────────────────────────────
// functions/api/mod/login.js
// POST /api/mod/login
// KV write: ZERO (HMAC stateless token)
// Moderators stored in MOD_KV (separate namespace)
// ─────────────────────────────────────────────
import { ok, err, cors, verifyPassword, signToken, TTL } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, password } = await request.json();
        if (!email || !password) return err('email ও password দিন');

        const key = `mod:${email.toLowerCase()}`;
        const raw = await env.MOD_KV.get(key);
        if (!raw) return err('Moderator account পাওয়া যায়নি', 404);

        const mod = JSON.parse(raw);
        if (!mod.is_active) return err('এই account নিষ্ক্রিয় করা হয়েছে', 403);

        const valid = await verifyPassword(password, mod.password_hash);
        if (!valid) return err('Password ভুল', 401);

        // ── HMAC token — no KV write ──
        const token = await signToken(
            {
                sub: mod.id,
                email: mod.email,
                name: mod.name,
                role: 'moderator',
                permissions: mod.permissions,
                exp: Date.now() + TTL.MOD_TOKEN,  // 1 day
            },
            env.JWT_SECRET || 'fallback-secret-change-this'
        );

        return ok({
            token,
            mod: {
                id: mod.id,
                name: mod.name,
                email: mod.email,
                permissions: mod.permissions,
            },
        });
    } catch (e) {
        return err(e.message, 500);
    }
}
