// ─────────────────────────────────────────────
// functions/api/_email-helper.js
// Cloudflare Email Workers — shared email sender
// Used by: forgot.js, save-order.js, update-order.js
//
// Requires in Cloudflare Pages settings:
//   Email binding: EMAIL (send_email type)
//   ENV: EMAIL_FROM, EMAIL_DOMAIN, STORE_NAME, STORE_URL
//
// No 3rd party — Cloudflare's own email infrastructure
// ─────────────────────────────────────────────

const BOUNDARY_PREFIX = 'cf_email_';

/**
 * Send email via Cloudflare Email Workers binding
 * @param {object} env - Cloudflare env object
 * @param {object} opts - { to, toName, subject, html }
 */
export async function sendEmail(env, { to, toName = '', subject, html }) {
    if (!env.EMAIL) {
        console.warn('EMAIL binding নেই — Cloudflare Pages settings এ add করুন');
        return;
    }

    const from     = env.EMAIL_FROM || `noreply@${env.EMAIL_DOMAIN}`;
    const fromName = env.STORE_NAME  || 'Smiee Shop';
    const boundary = `${BOUNDARY_PREFIX}${crypto.randomUUID().replace(/-/g, '')}`;

    const rawEmail = [
        `From: =?UTF-8?B?${btoa(unescape(encodeURIComponent(fromName)))}?= <${from}>`,
        `To: ${toName ? `=?UTF-8?B?${btoa(unescape(encodeURIComponent(toName)))}?= ` : ''}<${to}>`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        `X-Mailer: Smiee-Shop-CF-Workers`,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        html,
        ``,
        `--${boundary}--`,
    ].join('\r\n');

    const message = new EmailMessage(from, to, rawEmail);
    await env.EMAIL.send(message);
}

// ─────────────────────────────────────────────
// Email Templates (Order related)
// ─────────────────────────────────────────────

const STORE_COLORS = { primary: '#800000', bg: '#f5eded', light: '#fff8f8' };

function emailWrapper(storeName, content) {
    return `<!DOCTYPE html>
<html lang="bn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="center" style="padding:30px 10px;">
<table width="520" cellpadding="0" cellspacing="0"
       style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:100%;">
  <tr><td style="background:${STORE_COLORS.primary};padding:22px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${storeName}</h1>
  </td></tr>
  <tr><td style="padding:28px 24px;">${content}</td></tr>
  <tr><td style="background:#f9f9f9;padding:14px;text-align:center;">
    <p style="margin:0;color:#bbb;font-size:11px;">© ${new Date().getFullYear()} ${storeName} | সমস্যা হলে যোগাযোগ করুন</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** OTP Email */
export function buildOTPEmail({ otp, name, storeName }) {
    return emailWrapper(storeName, `
        <h2 style="color:#1a0a0a;margin:0 0 16px;font-size:19px;">পাসওয়ার্ড রিসেট</h2>
        <p style="color:#555;margin:0 0 20px;">হ্যালো${name ? ` <strong>${name}</strong>` : ''},</p>
        <p style="color:#555;margin:0 0 14px;">আপনার একবারের OTP কোড:</p>
        <div style="font-size:38px;font-weight:800;letter-spacing:10px;background:${STORE_COLORS.bg};
                    padding:22px;border-radius:10px;text-align:center;color:${STORE_COLORS.primary};
                    margin:0 0 20px;border:2px dashed rgba(128,0,0,0.25);">${otp}</div>
        <p style="color:#888;font-size:13px;background:${STORE_COLORS.light};padding:10px 14px;
                  border-left:3px solid ${STORE_COLORS.primary};border-radius:0 6px 6px 0;margin:0 0 16px;">
          ⏰ <strong>১০ মিনিট</strong> এর মধ্যে ব্যবহার করুন &nbsp;|&nbsp; 🔒 কাউকে শেয়ার করবেন না
        </p>
        <p style="color:#ccc;font-size:12px;margin:0;">আপনি এই request করেননি? Ignore করুন।</p>
    `);
}

/** Order Confirmation Email */
export function buildOrderConfirmEmail({ name, orderId, grandTotal, paymentMethod, storeUrl, storeName }) {
    return emailWrapper(storeName, `
        <div style="text-align:center;margin-bottom:22px;">
          <div style="font-size:52px;">✅</div>
          <h2 style="color:#1a0a0a;margin:8px 0 0;font-size:20px;">অর্ডার সফল হয়েছে!</h2>
        </div>
        <p style="color:#555;">হ্যালো${name ? ` <strong>${name}</strong>` : ' প্রিয় গ্রাহক'},</p>
        <p style="color:#555;margin:0 0 16px;">আপনার অর্ডার পাওয়া গেছে। আমরা শীঘ্রই প্রক্রিয়া শুরু করব।</p>
        <table width="100%" cellpadding="8" cellspacing="0"
               style="background:${STORE_COLORS.bg};border-radius:8px;margin-bottom:20px;">
          <tr><td style="color:#555;font-size:14px;border-bottom:1px solid rgba(128,0,0,0.1);">
            <strong>অর্ডার ID</strong></td>
            <td style="color:#1a0a0a;font-weight:700;border-bottom:1px solid rgba(128,0,0,0.1);">#${orderId}</td></tr>
          <tr><td style="color:#555;font-size:14px;border-bottom:1px solid rgba(128,0,0,0.1);">
            <strong>মোট</strong></td>
            <td style="color:${STORE_COLORS.primary};font-weight:700;font-size:16px;
                       border-bottom:1px solid rgba(128,0,0,0.1);">৳${grandTotal}</td></tr>
          <tr><td style="color:#555;font-size:14px;"><strong>পেমেন্ট</strong></td>
            <td style="color:#1a0a0a;">${paymentMethod}</td></tr>
        </table>
        <a href="${storeUrl}/track.html?id=${orderId}"
           style="display:block;background:${STORE_COLORS.primary};color:#fff;padding:14px;
                  text-decoration:none;border-radius:8px;text-align:center;font-size:16px;font-weight:600;">
          📦 অর্ডার ট্র্যাক করুন
        </a>
    `);
}

/** Order Status Update Email */
export function buildStatusUpdateEmail({ name, orderId, status, storeUrl, storeName }) {
    const STATUS = {
        Confirmed:  { emoji: '✅', text: 'কনফার্ম হয়েছে',         color: '#22c55e' },
        Processing: { emoji: '⚙️', text: 'প্রস্তুত করা হচ্ছে',    color: '#f59e0b' },
        Shipped:    { emoji: '🚚', text: 'কুরিয়ারে পাঠানো হয়েছে', color: '#3b82f6' },
        Delivered:  { emoji: '🎉', text: 'পৌঁছে গেছে!',            color: '#22c55e' },
        Cancelled:  { emoji: '❌', text: 'বাতিল হয়েছে',            color: '#ef4444' },
    };
    const s = STATUS[status] || { emoji: '📦', text: status, color: STORE_COLORS.primary };

    return emailWrapper(storeName, `
        <div style="text-align:center;padding:10px 0 20px;">
          <div style="font-size:56px;">${s.emoji}</div>
          <h2 style="color:${s.color};margin:10px 0 4px;">${s.text}</h2>
          <p style="color:#888;font-size:14px;margin:0;">অর্ডার #${orderId}</p>
        </div>
        <p style="color:#555;">হ্যালো${name ? ` <strong>${name}</strong>` : ''},</p>
        <p style="color:#555;margin:0 0 20px;">আপনার অর্ডারের স্ট্যাটাস আপডেট হয়েছে।</p>
        <a href="${storeUrl}/track.html?id=${orderId}"
           style="display:block;background:${STORE_COLORS.primary};color:#fff;padding:14px;
                  text-decoration:none;border-radius:8px;text-align:center;font-size:16px;font-weight:600;">
          অর্ডার ট্র্যাক করুন →
        </a>
    `);
}
