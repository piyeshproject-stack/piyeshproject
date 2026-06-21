# 🛒 অর্ডার সিস্টেম আপডেট প্ল্যান

---

## ফিচার ১: মেসেজিং অ্যাপ দিয়ে অর্ডার (Order via Message)

### বর্তমান অবস্থা
- শুধু WhatsApp অর্ডার বাটন আছে `product.html` এ
- Settings এ `allow_whatsapp_order` ও `whatsapp_number` আছে

### কী পরিবর্তন হবে

**Product Page (`product.html`):**
- "Order via WhatsApp" বাটনের বদলে **"Order by Message"** বাটন থাকবে
- ক্লিক করলে একটা **বটম-শিট/মডাল** ওপেন হবে — সেখানে এডমিন যেসব messaging app ON করেছে সেগুলোর আইকন ও নাম দেখাবে
- প্রতিটা অ্যাপে ক্লিক করলে WhatsApp এর মতো **text template** সহ সরাসরি ওই অ্যাপে চলে যাবে

**Admin Settings (`admin/settings.html`):**
- নতুন সেকশন: **"📱 Messaging Apps for Order"**
- ১৫-২৫টা সোশ্যাল মিডিয়া/মেসেজিং অ্যাপ থাকবে
- প্রতিটার জন্য: **ON/OFF টগল**, **Number/Username/UID ইনপুট**

**সাপোর্টেড অ্যাপ লিস্ট:**

| # | অ্যাপ | লিঙ্ক প্যাটার্ন |
|---|-------|-----------------|
| 1 | WhatsApp | `https://wa.me/{number}?text={msg}` |
| 2 | Telegram | `https://t.me/{username}?text={msg}` |
| 3 | Messenger | `https://m.me/{username}` |
| 4 | Viber | `viber://chat?number={number}` |
| 5 | Signal | `https://signal.me/#p/{number}` |
| 6 | IMO | `https://imo.im/{number}` |
| 7 | LINE | `https://line.me/R/ti/p/{id}` |
| 8 | WeChat | `weixin://dl/chat?{id}` |
| 9 | Skype | `skype:{username}?chat` |
| 10 | Discord | `https://discord.com/users/{id}` |
| 11 | Snapchat | `https://snapchat.com/add/{username}` |
| 12 | Instagram | `https://ig.me/m/{username}` |
| 13 | Twitter/X | `https://twitter.com/messages/compose?recipient_id={id}` |
| 14 | TikTok | `https://tiktok.com/@{username}` |
| 15 | KakaoTalk | `https://open.kakao.com/o/{id}` |
| 16 | Email | `mailto:{email}?subject={subject}&body={msg}` |
| 17 | SMS | `sms:{number}?body={msg}` |

### Supabase পরিবর্তন

**`settings` টেবিলে নতুন কলাম:**

| কলাম নাম | টাইপ | বর্ণনা |
|----------|------|--------|
| `messaging_apps` | `jsonb` | অ্যাপগুলোর কনফিগ অ্যারে |

**`messaging_apps` JSON স্ট্রাকচার:**
```json
[
  {
    "key": "whatsapp",
    "name": "WhatsApp",
    "enabled": true,
    "contact": "8801XXXXXXXXX"
  }
]
```

### ফাইল পরিবর্তন
- `admin/settings.html` — নতুন সেকশন
- `product.html` — WhatsApp বাটন → মেসেজিং বটম-শিট

---

## ফিচার ২: Pickup via Store অর্ডার

### কী পরিবর্তন হবে

**Product Page (`product.html`):**
- নতুন বাটন: **"🚶 Pickup from Store"** (হাঁটা মানুষের আইকন)
- ক্লিক করলে সরাসরি অর্ডার — delivery address লাগবে না
- অর্ডারে `order_type: "pickup"` সেভ হবে
- আলাদা Telegram Bot এ নোটিফিকেশন যাবে

**Checkout Flow (Pickup):**
- Step 2 (Delivery Info) স্কিপ হবে
- Delivery charge = ০ টাকা

**Admin Panel:**

`admin/settings.html` এ নতুন সেকশন:
- Enable/Disable টগল
- Pickup Telegram Bot Token
- Pickup Telegram Chat ID
- Store Address (optional)

`admin/orders.html` এ নতুন ফিল্টার:
- **"Pickup Orders"** — `order_type === 'pickup'` দিয়ে ফিল্টার

### Supabase পরিবর্তন

**`settings` টেবিলে নতুন কলাম:**

| কলাম নাম | টাইপ | বর্ণনা |
|----------|------|--------|
| `allow_pickup` | `boolean` | Pickup অর্ডার ON/OFF |
| `pickup_bot_token` | `text` | Pickup Telegram Bot Token |
| `pickup_chat_id` | `text` | Pickup Telegram Chat ID |
| `store_address` | `text` | স্টোরের ঠিকানা |

**`orders` টেবিলে নতুন কলাম:**

| কলাম নাম | টাইপ | ডিফল্ট | বর্ণনা |
|----------|------|--------|--------|
| `order_type` | `text` | `'delivery'` | `'delivery'` অথবা `'pickup'` |

### ফাইল পরিবর্তন
- `product.html` — Pickup বাটন
- `checkout.html` — Pickup ফ্লো
- `admin/settings.html` — Pickup সেটিংস
- `admin/orders.html` — Pickup ফিল্টার

---

## ফিচার ৩: প্রোডাক্ট/ক্যাটাগরি ভিত্তিক কুপন রুলস

### বর্তমান অবস্থা
- `promos` টেবিলে: `code`, `discount`, `is_active`, `usage_limit`, `used_count`, `expires_at`
- কুপন সব প্রোডাক্টে কাজ করে — কোনো রুল নেই

### কী পরিবর্তন হবে

**Admin Promo (`admin/promos.html`):**
- কুপন মডালে নতুন ফিল্ড:
  - **Applicable To**: `All Products` / `Specific Products` / `Specific Categories`
  - **Product Selector**: মাল্টি-সিলেক্ট
  - **Category Selector**: মাল্টি-সিলেক্ট
  - **Minimum Quantity**: নির্দিষ্ট quantity এর উপরে
  - **Minimum Amount (৳)**: নির্দিষ্ট টাকার উপরে
  - **Discount Type**: `Fixed (৳)` / `Percentage (%)`

**Checkout (`checkout.html`):**
- কুপন apply করার সময় ভ্যালিডেশন চেক করবে

### Supabase পরিবর্তন

**`promos` টেবিলে নতুন কলাম:**

| কলাম নাম | টাইপ | ডিফল্ট | বর্ণনা |
|----------|------|--------|--------|
| `applicable_to` | `text` | `'all'` | `'all'`, `'products'`, `'categories'` |
| `product_ids` | `jsonb` | `[]` | সিলেক্টেড প্রোডাক্ট ID অ্যারে |
| `category_ids` | `jsonb` | `[]` | সিলেক্টেড ক্যাটাগরি ID অ্যারে |
| `min_quantity` | `int4` | `0` | মিনিমাম quantity |
| `min_amount` | `int4` | `0` | মিনিমাম টাকা |
| `discount_type` | `text` | `'fixed'` | `'fixed'` অথবা `'percentage'` |

### ফাইল পরিবর্তন
- `admin/promos.html` — নতুন ফিল্ড + সিলেক্টর
- `checkout.html` — কুপন ভ্যালিডেশন লজিক

---

## ফিচার ৪: মাল্টিপল ক্যাটাগরিতে প্রোডাক্ট

### বর্তমান অবস্থা
- `products.category_id` — একটাই ক্যাটাগরি

### কী পরিবর্তন হবে

- Category dropdown → **Multi-select checkbox**
- নতুন Junction Table দিয়ে Many-to-Many রিলেশন

### Supabase পরিবর্তন

**নতুন টেবিল: `product_categories`**

| কলাম নাম | টাইপ | বর্ণনা |
|----------|------|--------|
| `id` | `uuid` (PK, auto) | Primary key |
| `product_id` | `uuid` (FK → products.id) | প্রোডাক্ট |
| `category_id` | `uuid` (FK → categories.id) | ক্যাটাগরি |

> পুরনো `products.category_id` রেখে দেওয়া হবে backward compatibility এর জন্য। মাইগ্রেশন করে পুরনো ডাটা নতুন টেবিলে কপি হবে।

### ফাইল পরিবর্তন
- `admin/products.html` — মাল্টি-ক্যাটাগরি সিলেক্টর
- `shop.html` — ফিল্টার লজিক আপডেট
- `index.html` — ক্যাটাগরি ভিত্তিক প্রোডাক্ট লোডিং

---

## সারাংশ: Supabase এ সব পরিবর্তন

### পরিবর্তিত টেবিল

**`settings` — নতুন কলাম:**
- `messaging_apps` (jsonb)
- `allow_pickup` (boolean)
- `pickup_bot_token` (text)
- `pickup_chat_id` (text)
- `store_address` (text)

**`orders` — নতুন কলাম:**
- `order_type` (text, default 'delivery')

**`promos` — নতুন কলাম:**
- `applicable_to` (text, default 'all')
- `product_ids` (jsonb, default [])
- `category_ids` (jsonb, default [])
- `min_quantity` (int4, default 0)
- `min_amount` (int4, default 0)
- `discount_type` (text, default 'fixed')

### নতুন টেবিল
**`product_categories`** — product_id (uuid FK), category_id (uuid FK)

---

## কাজের ক্রম

1. Supabase এ সব নতুন কলাম ও টেবিল তৈরি
2. ফিচার ৪ (Multi-category) — কারণ ফিচার ৩ এর dependency
3. ফিচার ৩ (Coupon rules)
4. ফিচার ১ (Messaging apps)
5. ফিচার ২ (Pickup order)
