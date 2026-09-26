// ─────────────────────────────────────────────
// scripts/send-campaign.js
// Marketing bulk email — Gmail SMTP দিয়ে
// Google free limit: 500 emails/day
// No 3rd party service!
// ─────────────────────────────────────────────
const nodemailer = require('nodemailer');

const STORE     = process.env.STORE_NAME || 'Smiee Shop';
const STORE_URL = process.env.STORE_URL  || '#';
const FROM      = `${STORE} <${process.env.GMAIL_USER}>`;

// Gmail daily limit: 500/day — batch এ পাঠাবো
const DAILY_LIMIT  = 480;  // 500 limit, 480 রেখে safe margin
const DELAY_PER_MAIL = 300; // 300ms between emails (rate limiting এড়াতে)

// ── Gmail transporter ──
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
    },
    pool: true,         // connection pool — faster
    maxConnections: 3,  // parallel connections
});

// ── Marketing Templates ──
function buildMarketingEmail(type, recipient) {
    const name = recipient.customer_name || 'প্রিয় গ্রাহক';
    const unsubLink = `${STORE_URL}/unsubscribe.html?email=${encodeURIComponent(recipient.customer_email)}`;

    const baseStyle = `font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);`;
    const header = `<div style="background:#800000;padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">${STORE}</h1></div>`;
    const footer = `<div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999;">© ${new Date().getFullYear()} ${STORE} | <a href="${unsubLink}" style="color:#999;">Unsubscribe</a></div>`;

    const templates = {
        'marketing-promo': {
            subject: process.env.SUBJECT || '🛍️ বিশেষ অফার আপনার জন্য!',
            html: `<div style="${baseStyle}">${header}
                <div style="padding:30px;">
                    <h2 style="color:#1a0a0a;">হ্যালো ${name}! 👋</h2>
                    <p style="color:#555;font-size:16px;line-height:1.6;">আমাদের বিশেষ অফার শুধুমাত্র আপনার জন্য এসেছে।</p>
                    <div style="background:#f5eded;border-left:4px solid #800000;padding:20px;border-radius:0 8px 8px 0;margin:20px 0;">
                        <h3 style="color:#800000;margin:0 0 8px;">🔥 সীমিত সময়ের অফার!</h3>
                        <p style="color:#555;margin:0;">এখনই অর্ডার করুন এবং সেরা দামে পণ্য পান।</p>
                    </div>
                    <a href="${STORE_URL}" style="display:block;background:#800000;color:#fff;padding:16px;text-decoration:none;border-radius:8px;text-align:center;font-size:18px;font-weight:600;margin-top:20px;">
                        এখনই দেখুন 🛍️
                    </a>
                </div>${footer}</div>`,
        },
        'marketing-newsletter': {
            subject: process.env.SUBJECT || '📰 নিউজলেটার — নতুন আপডেট',
            html: `<div style="${baseStyle}">${header}
                <div style="padding:30px;">
                    <h2 style="color:#1a0a0a;">হ্যালো ${name}!</h2>
                    <p style="color:#555;font-size:16px;line-height:1.6;">এই সপ্তাহে আমাদের নতুন পণ্য এবং খবর:</p>
                    <ul style="color:#555;font-size:15px;line-height:2;">
                        <li>নতুন কালেকশন এসেছে</li>
                        <li>বিশেষ ছাড় চলছে</li>
                        <li>দ্রুত ডেলিভারি নিশ্চিত</li>
                    </ul>
                    <a href="${STORE_URL}" style="display:block;background:#800000;color:#fff;padding:16px;text-decoration:none;border-radius:8px;text-align:center;font-size:18px;font-weight:600;margin-top:20px;">
                        পণ্য দেখুন →
                    </a>
                </div>${footer}</div>`,
        },
        'marketing-update': {
            subject: process.env.SUBJECT || '📢 গুরুত্বপূর্ণ আপডেট',
            html: `<div style="${baseStyle}">${header}
                <div style="padding:30px;">
                    <h2 style="color:#1a0a0a;">গুরুত্বপূর্ণ আপডেট</h2>
                    <p style="color:#555;font-size:16px;line-height:1.6;">হ্যালো ${name}, আমাদের সার্ভিসে কিছু নতুন পরিবর্তন এসেছে যা আপনার জন্য জানা জরুরি।</p>
                    <a href="${STORE_URL}" style="display:block;background:#800000;color:#fff;padding:16px;text-decoration:none;border-radius:8px;text-align:center;font-size:18px;font-weight:600;margin-top:20px;">
                        আরও জানুন →
                    </a>
                </div>${footer}</div>`,
        },
    };

    return templates[type] || templates['marketing-promo'];
}

// ── Fetch subscribers from D1 via API ──
async function getSubscribers() {
    const res = await fetch(process.env.D1_API_URL + '/api/admin-query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.D1_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
            sql: `SELECT DISTINCT customer_name, customer_email 
                  FROM orders 
                  WHERE customer_email IS NOT NULL 
                    AND customer_email != ''
                    AND status NOT IN ('Cancelled')
                  ORDER BY created_at DESC
                  LIMIT 5000`,
        }),
    });
    const data = await res.json();
    return data.result?.[0]?.results || [];
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Main ──
async function main() {
    const type      = process.env.EMAIL_TYPE || 'marketing-promo';
    const testEmail = process.env.TEST_EMAIL;

    console.log(`\n🚀 Campaign শুরু হচ্ছে — Type: ${type}`);

    // Verify Gmail connection first
    try {
        await transporter.verify();
        console.log('✅ Gmail connection OK');
    } catch (e) {
        console.error('❌ Gmail connection failed:', e.message);
        process.exit(1);
    }

    let subscribers;

    if (testEmail) {
        console.log(`🧪 TEST MODE: শুধু ${testEmail} এ পাঠাবে`);
        subscribers = [{ customer_email: testEmail, customer_name: 'Test User' }];
    } else {
        console.log('📥 Subscriber list লোড করছি...');
        subscribers = await getSubscribers();
        console.log(`📋 মোট: ${subscribers.length} জন subscriber`);

        // Gmail daily limit check
        if (subscribers.length > DAILY_LIMIT) {
            console.log(`⚠️  Gmail limit: ${DAILY_LIMIT}/day — আজ শুধু প্রথম ${DAILY_LIMIT} জনকে পাঠাবে`);
            subscribers = subscribers.slice(0, DAILY_LIMIT);
        }
    }

    let sent = 0, failed = 0;

    for (const recipient of subscribers) {
        const { subject, html } = buildMarketingEmail(type, recipient);

        try {
            await transporter.sendMail({
                from: FROM,
                to: recipient.customer_email,
                subject,
                html,
            });
            sent++;

            if (sent % 50 === 0) {
                console.log(`📤 পাঠানো: ${sent}/${subscribers.length}`);
            }

            // Rate limiting — Gmail এর সাথে সমস্যা এড়াতে
            await sleep(DELAY_PER_MAIL);

        } catch (e) {
            failed++;
            console.error(`❌ ${recipient.customer_email}: ${e.message}`);
        }
    }

    console.log(`\n🎉 Campaign সম্পন্ন!`);
    console.log(`   ✅ সফল:  ${sent}`);
    console.log(`   ❌ ব্যর্থ: ${failed}`);
    console.log(`   📊 মোট:  ${subscribers.length}`);

    transporter.close();
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
