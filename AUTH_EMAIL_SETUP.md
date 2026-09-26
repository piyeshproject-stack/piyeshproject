# 🔐 Auth & Email System — Setup Guide
## Stack: Cloudflare Only + GitHub Actions (No 3rd party!)

---

## ১. Architecture Overview

```
INSTANT (Transactional) — Cloudflare Functions + Email Workers:
  OTP / Password Reset  → Cloudflare Function → CF Email Workers → instant ⚡
  Order Confirmation    → Cloudflare Function → CF Email Workers → instant ⚡
  Order Status Update   → Cloudflare Function → CF Email Workers → instant ⚡

BULK (Marketing) — GitHub Actions + Gmail:
  Newsletter / Promo    → GitHub Actions → Gmail SMTP → 500/day free 📧
  Manual or Scheduled   → Admin triggers from GitHub UI
```

---

## ২. Cloudflare KV Namespaces তৈরি

**Dashboard → Workers & Pages → KV → Create namespace**

```
Namespace name: USERS_KV    (customer accounts)
Namespace name: MOD_KV      (moderator accounts)
```

**Pages Settings → Functions → KV namespace bindings:**
```
Variable name: USERS_KV  → Select: USERS_KV
Variable name: MOD_KV    → Select: MOD_KV
```

---

## ৩. Cloudflare Email Workers Setup (Transactional Email)

> ✅ Cloudflare এর নিজস্ব email — কোনো 3rd party নেই!

**Step 1: Email Routing চালু করুন**
1. Cloudflare Dashboard → আপনার domain → Email → Email Routing
2. "Enable Email Routing" চালু করুন
3. DNS records automatically add হবে

**Step 2: Send Email binding add করুন**

Pages → আপনার project → Settings → Functions → Email bindings:
```
Variable name: EMAIL
Type: Send email
Destination: noreply@yourdomain.com
```

**Step 3: Cloudflare ENV Variables সেট করুন**

Pages → Settings → Environment Variables:
```
JWT_SECRET      = (32+ char random string)
ADMIN_USERNAME  = (admin username)
ADMIN_PASSWORD  = (admin password)
STORE_NAME      = Smiee Shop
STORE_URL       = https://smiee.pages.dev
EMAIL_FROM      = noreply@yourdomain.com
EMAIL_DOMAIN    = yourdomain.com
GH_TOKEN        = (GitHub PAT — শুধু marketing campaign trigger এর জন্য)
GH_REPO         = username/repo-name
```

> **Email limit:** Cloudflare Email Workers — **100,000 emails/month FREE** ✅

---

## ৪. Gmail Setup (Marketing bulk email only)

**Step 1: Gmail App Password**
1. Google Account → Security → 2-Step Verification ON করুন
2. Security → App Passwords → "Mail" → Generate
3. 16-char password পাবেন

**Step 2: GitHub Secrets**

Repo → Settings → Secrets → Actions → New secret:
```
GMAIL_USER      = youremail@gmail.com
GMAIL_APP_PASS  = xxxx xxxx xxxx xxxx
STORE_NAME      = Smiee Shop
STORE_URL       = https://smiee.pages.dev
D1_API_URL      = https://smiee.pages.dev
D1_ADMIN_TOKEN  = (admin token)
```

**Gmail daily limit: 500 emails/day (free)**

---

## ৫. Moderator যোগ করুন

```bash
# Linux/Mac
curl -X POST https://smiee.pages.dev/api/admin/add-mod \
  -H "Authorization: Basic $(echo -n 'ADMIN_USER:ADMIN_PASS' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "email": "mod@example.com",
    "name": "Moderator Name",
    "mod_password": "secure123",
    "permissions": ["orders", "reviews"]
  }'

# Permissions: orders | products | reviews | promos | customers
```

---

## ৬. KV Write Usage (10K users/month)

| Action | Writes | Monthly |
|--------|--------|---------|
| Register | 1/user | 10,000 |
| Login | **0** (HMAC) | 0 |
| OTP request | 2 (OTP + rate) | ~1,000 |
| Password reset | 2 (update + delete) | ~500 |
| Moderator add | 1 | ~10 |
| **Total** | | **~11,510** |

> **Free limit: 30,000/month — শুধু ~38% ব্যবহার হবে** ✅

---

## ৭. API Endpoints

### Customer
| Endpoint | Method | KV Writes | কাজ |
|----------|--------|-----------|-----|
| `/api/user/register` | POST | 1 | Account তৈরি |
| `/api/user/login` | POST | **0** | Login + HMAC token |
| `/api/user/me` | GET | 0 | Profile |
| `/api/user/orders` | GET | 0 | Order history |
| `/api/user/forgot` | POST | 2 | OTP email (CF Email) |
| `/api/user/reset` | POST | 2 | Password change |

### Moderator
| Endpoint | Method | কাজ |
|----------|--------|-----|
| `/api/mod/login` | POST | Mod login |
| `/api/mod/verify` | GET | Token verify |

### Super Admin
| Endpoint | Method | কাজ |
|----------|--------|-----|
| `/api/admin/add-mod` | POST | Mod add/edit/delete/list |

---

## ৮. Security Checklist

- ✅ PBKDF2 password hashing (Web Crypto — built-in)
- ✅ HMAC-signed stateless tokens (no session KV write)
- ✅ OTP rate limiting (3/15min per email)
- ✅ Anti-enumeration (forgot password generic response)
- ✅ OTP 10-min auto-expire (KV TTL)
- ✅ Admin auth via ENV (never in DB)
- ✅ Moderators in separate KV (isolated from user data)
- ✅ Email status updates non-blocking (waitUntil)
- ✅ Input validation on all endpoints
