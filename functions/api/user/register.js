// ─────────────────────────────────────────────
// functions/api/user/register.js
// POST /api/user/register
// KV write: 1 per new user (email as key)
// ─────────────────────────────────────────────
import { ok, err, cors, hashPassword, CORS } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, email, phone, password } = await request.json();

        // ── Validate ──
        if (!name || !email || !phone || !password)
            return err('name, email, phone, password সব দরকার');
        if (password.length < 6)
            return err('Password কমপক্ষে ৬ অক্ষর হতে হবে');
        if (!/^\S+@\S+\.\S+$/.test(email))
            return err('সঠিক email দিন');
        if (!/^01[0-9]{9}$/.test(phone))
            return err('সঠিক বাংলাদেশি phone নম্বর দিন (01XXXXXXXXX)');

        const key = `user:${email.toLowerCase()}`;

        // ── Check existing ──
        const existing = await env.USERS_KV.get(key);
        if (existing) return err('এই email দিয়ে আগে একটি account আছে', 409);

        // ── Hash password (PBKDF2, no library needed) ──
        const password_hash = await hashPassword(password);

        const user = {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.toLowerCase(),
            phone,
            password_hash,
            created_at: new Date().toISOString(),
            verified: false,   // email verification optional
        };

        // ── 1 KV write ──
        await env.USERS_KV.put(key, JSON.stringify(user));

        return ok({ message: 'Account তৈরি হয়েছে!', userId: user.id }, 201);
    } catch (e) {
        return err(e.message, 500);
    }
}
