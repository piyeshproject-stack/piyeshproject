// ─────────────────────────────────────────────
// functions/api/user/reset.js
// POST /api/user/reset
// KV write: 1 (update password hash)
// KV delete: 1 (remove OTP after use)
// ─────────────────────────────────────────────
import { ok, err, cors, hashPassword } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, otp, new_password } = await request.json();

        if (!email || !otp || !new_password)
            return err('email, otp, new_password সব দরকার');
        if (new_password.length < 6)
            return err('Password কমপক্ষে ৬ অক্ষর হতে হবে');

        const otpKey   = `otp:${email.toLowerCase()}`;
        const userKey  = `user:${email.toLowerCase()}`;

        // ── Check OTP ──
        const storedOTP = await env.USERS_KV.get(otpKey);
        if (!storedOTP) return err('OTP মেয়াদ শেষ বা দেওয়া হয়নি', 410);
        if (storedOTP !== otp.toString()) return err('OTP ভুল', 401);

        // ── Get user ──
        const raw = await env.USERS_KV.get(userKey);
        if (!raw) return err('Account পাওয়া যায়নি', 404);
        const user = JSON.parse(raw);

        // ── Update password ──
        user.password_hash = await hashPassword(new_password);
        user.updated_at = new Date().toISOString();

        // ── KV: 1 write (updated user) + 1 delete (OTP cleanup) ──
        await Promise.all([
            env.USERS_KV.put(userKey, JSON.stringify(user)),
            env.USERS_KV.delete(otpKey),  // OTP delete — no longer needed
        ]);

        return ok({ message: 'Password সফলভাবে পরিবর্তন হয়েছে! আবার login করুন।' });
    } catch (e) {
        return err(e.message, 500);
    }
}
