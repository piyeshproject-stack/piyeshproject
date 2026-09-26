// ─────────────────────────────────────────────
// scripts/send-transactional.js
// GitHub Actions এ চলে — Gmail SMTP দিয়ে instant email
// Triggered by: Cloudflare Function → GitHub repository_dispatch
// No 3rd party email service!
// ─────────────────────────────────────────────
const nodemailer = require('nodemailer');

// ── Gmail transporter (Google App Password) ──
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,  // Gmail App Password (16 chars)
    },
});

const STORE = process.env.STORE_NAME || 'Smiee Shop';
const STORE_URL = process.env.STORE_URL || '#';
const FROM = `${STORE} <${process.env.GMAIL_USER}>`;

// ── Email Templates ──
const templates = {

    // OTP / Forgot Password
    otp: ({ to_name, otp }) => ({
        subject: `🔐 আপনার OTP কোড — ${STORE}`,
        html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:420px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
            <div style="background:#800000;padding:24px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:22px;">${STORE}</h1>
            </div>
            <div style="padding:30px;">
                <h2 style="color:#1a0a0a;margin-top:0;">পাসওয়ার্ড রিসেট</h2>
                <p style="color:#555;">হ্যালো ${to_name || 'প্রিয় গ্রাহক'},</p>
                <p style="color:#555;">আপনার OTP কোড:</p>
                <div style="font-size:38px;font-weight:700;letter-spacing:10px;background:#f5eded;
                            padding:24px;border-radius:10px;text-align:center;color:#800000;margin:20px 0;
                            border:2px dashed #800000;">
                    ${otp}
                </div>
                <p style="color:#888;font-size:13px;">⏰ এই কোড <strong>১০ মিনিট</strong> পর্যন্ত valid।</p>
                <p style="color:#aaa;font-size:12px;margin-top:20px;">আপনি এই request না করলে ignore করুন।</p>
            </div>
            <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
                © ${new Date().getFullYear()} ${STORE}
            </div>
        </div>`,
    }),

    // Order Confirmation
    order_confirm: ({ to_name, order_id, grand_total, payment_method }) => ({
        subject: `✅ অর্ডার কনফার্ম হয়েছে #${order_id} — ${STORE}`,
        html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
            <div style="background:#800000;padding:24px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:22px;">${STORE}</h1>
            </div>
            <div style="padding:30px;">
                <div style="text-align:center;margin-bottom:20px;">
                    <span style="font-size:48px;">✅</span>
                    <h2 style="color:#1a0a0a;margin:10px 0;">অর্ডার সফল হয়েছে!</h2>
                </div>
                <p style="color:#555;">হ্যালো ${to_name || 'প্রিয় গ্রাহক'},</p>
                <p style="color:#555;">আপনার অর্ডার পাওয়া গেছে এবং প্রক্রিয়া শুরু হয়েছে।</p>
                <div style="background:#f5eded;padding:16px;border-radius:8px;margin:20px 0;">
                    <p style="margin:4px 0;"><strong>অর্ডার ID:</strong> ${order_id}</p>
                    <p style="margin:4px 0;"><strong>মোট:</strong> ৳${grand_total}</p>
                    <p style="margin:4px 0;"><strong>পেমেন্ট:</strong> ${payment_method}</p>
                </div>
                <a href="${STORE_URL}/track.html?id=${order_id}"
                   style="display:block;background:#800000;color:#fff;padding:14px;text-decoration:none;
                          border-radius:8px;text-align:center;font-size:16px;font-weight:600;">
                    অর্ডার ট্র্যাক করুন 📦
                </a>
            </div>
            <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
                © ${new Date().getFullYear()} ${STORE}
            </div>
        </div>`,
    }),

    // Order Status Update
    order_status: ({ to_name, order_id, order_status }) => {
        const statusMap = {
            Confirmed:  { emoji: '✅', text: 'কনফার্ম হয়েছে' },
            Processing: { emoji: '⚙️', text: 'প্রস্তুত করা হচ্ছে' },
            Shipped:    { emoji: '🚚', text: 'পাঠানো হয়েছে' },
            Delivered:  { emoji: '🎉', text: 'পৌঁছে গেছে' },
            Cancelled:  { emoji: '❌', text: 'বাতিল হয়েছে' },
        };
        const s = statusMap[order_status] || { emoji: '📦', text: order_status };
        return {
            subject: `${s.emoji} অর্ডার আপডেট: ${s.text} — #${order_id}`,
            html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
                <div style="background:#800000;padding:24px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">${STORE}</h1>
                </div>
                <div style="padding:30px;text-align:center;">
                    <div style="font-size:56px;margin-bottom:12px;">${s.emoji}</div>
                    <h2 style="color:#1a0a0a;margin:0 0 8px;">অর্ডার ${s.text}</h2>
                    <p style="color:#555;">হ্যালো ${to_name || 'প্রিয় গ্রাহক'}, আপনার অর্ডার <strong>#${order_id}</strong> এর স্ট্যাটাস আপডেট হয়েছে।</p>
                    <a href="${STORE_URL}/track.html?id=${order_id}"
                       style="display:inline-block;background:#800000;color:#fff;padding:14px 28px;
                              text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;margin-top:16px;">
                        অর্ডার ট্র্যাক করুন
                    </a>
                </div>
                <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">
                    © ${new Date().getFullYear()} ${STORE}
                </div>
            </div>`,
        };
    },
};

// ── Main ──
async function main() {
    const type     = process.env.EMAIL_TYPE;
    const toEmail  = process.env.TO_EMAIL;
    const toName   = process.env.TO_NAME || '';

    if (!toEmail) {
        console.error('❌ TO_EMAIL দেওয়া হয়নি');
        process.exit(1);
    }

    const templateFn = templates[type];
    if (!templateFn) {
        console.error(`❌ Unknown email type: ${type}`);
        process.exit(1);
    }

    const { subject, html } = templateFn({
        to_name:      toName,
        otp:          process.env.OTP,
        order_id:     process.env.ORDER_ID,
        order_status: process.env.ORDER_STATUS,
        grand_total:  process.env.GRAND_TOTAL,
        payment_method: process.env.PAYMENT_METHOD,
    });

    console.log(`📧 Sending [${type}] to: ${toEmail}`);

    try {
        const info = await transporter.sendMail({
            from: FROM,
            to: toEmail,
            subject,
            html,
        });
        console.log(`✅ Email পাঠানো হয়েছে! MessageId: ${info.messageId}`);
    } catch (e) {
        console.error('❌ Email পাঠানো যায়নি:', e.message);
        process.exit(1);
    }
}

main();
