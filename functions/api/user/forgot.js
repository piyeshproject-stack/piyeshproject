// ─────────────────────────────────────────────
// functions/api/user/forgot.js
// POST /api/user/forgot
//
// Security:
//  ✅ OTP rate limit: 3 per 15 min (KV)
//  ✅ No user enumeration (generic response)
//  ✅ OTP 10-min auto-expire (KV TTL)
//  ✅ HMAC signed tokens for reset flow
//
// Email: Cloudflare Email Workers (instant, no 3rd party)
// ─────────────────────────────────────────────
import { ok, err, cors, generateOTP } from '../_auth-helper.js';
import { sendEmail, buildOTPEmail } from '../_email-helper.js';

export const onRequestOptions = () => cors();

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email } = await request.json();
        if (!email || !/^\S+@\S+\.\S+$/.test(email))
            return err('সঠিক email দিন');

        const emailLower = email.toLowerCase();

        // ── Rate limit: 3 OTP per 15 min ──
        const rateKey   = `otp_rate:${emailLower}`;
        const rateRaw   = await env.USERS_KV.get(rateKey);
        const rateCount = rateRaw ? parseInt(rateRaw) : 0;

        if (rateCount >= 3)
            return err('অনেক বেশি request। ১৫ মিনিট পর চেষ্টা করুন।', 429);

        // ── Fetch user (no enumeration — same response either way) ──
        const userRaw = await env.USERS_KV.get(`user:${emailLower}`);

        if (userRaw) {
            const user = JSON.parse(userRaw);
            const otp  = generateOTP();

            // ── KV: OTP + rate counter (parallel) ──
            await Promise.all([
                env.USERS_KV.put(`otp:${emailLower}`, otp, { expirationTtl: 600 }),
                env.USERS_KV.put(rateKey, String(rateCount + 1), { expirationTtl: 900 }),
            ]);

            // ── Cloudflare Email Workers — instant, no 3rd party ──
            await sendEmail(env, {
                to:      email,
                toName:  user.name || '',
                subject: `🔐 আপনার OTP — ${env.STORE_NAME || 'Smiee Shop'}`,
                html:    buildOTPEmail({ otp, name: user.name, storeName: env.STORE_NAME }),
            });
        }

        // Same response whether user exists or not (no enumeration)
        return ok({ message: 'যদি এই email এ account থাকে, OTP পাঠানো হয়েছে। ১০ মিনিটের মধ্যে দিন।' });

    } catch (e) {
        console.error('forgot error:', e.message);
        return err('সমস্যা হয়েছে। আবার চেষ্টা করুন।', 500);
    }
}
