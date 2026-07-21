# Cloudflare D1 (SQLite) Schema for E-Commerce Backend

This document contains the exact database schema required to migrate your backend to **Cloudflare D1**. Since D1 runs on SQLite, we have adapted all data types according to SQLite's features and your exact codebase operations.

## Setup Instructions

1. **Log in to Cloudflare Dashboard** and navigate to **Workers & Pages > D1**.
2. Click **Create Database** and give it a name (e.g., `ecommerce-db`).
3. Click on your newly created database to open its dashboard.
4. Go to the **Console** tab.
5. Copy the entire SQL schema below and paste it into the console editor.
6. Click **Execute** to run the commands and create all tables.

---

## Complete SQL Schema

```sql
-- 1. SETTINGS TABLE
-- Note: id is explicitly an integer for single-row settings configurations.
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    store_name TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    footer_text TEXT,
    whatsapp_number TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    bkash_number TEXT,
    nagad_number TEXT,
    binance_manual_uid TEXT,
    gateway_api_key TEXT,
    gateway_api_key_v2 TEXT,
    gateway_version TEXT,
    allow_cod INTEGER DEFAULT 1,
    enable_fun_checkbox INTEGER DEFAULT 0,
    allow_whatsapp_order INTEGER DEFAULT 1,
    allow_msg_order INTEGER DEFAULT 1,
    advance_amount REAL DEFAULT 0,
    advance_method TEXT,
    telegram_main_bot TEXT,
    telegram_main_chats TEXT, -- Stored as stringified JSON array
    telegram_draft_bot TEXT,
    telegram_draft_chat TEXT,
    messaging_apps TEXT, -- Stored as stringified JSON array
    allow_pickup INTEGER DEFAULT 1,
    store_address TEXT,
    store_map_link TEXT,
    pickup_bot_token TEXT,
    pickup_chat_id TEXT,
    binance_pay_uid TEXT,
    binance_proxy_url TEXT,
    binance_api_key TEXT,
    binance_api_secret TEXT,
    usd_to_bdt_rate REAL DEFAULT 110,
    verify_mode TEXT,
    supabase_edge_url TEXT,
    hf_api_url TEXT,
    crypto_coins TEXT, -- Stored as stringified JSON array
    review_imgbb_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
-- Complex arrays like gallery_images and variants must be passed/stored as JSON strings.
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    base_price REAL DEFAULT 0,
    flash_sale_price REAL DEFAULT 0,
    flash_sale_end TEXT,
    video_url TEXT,
    video_type TEXT,
    is_active INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    is_add_once INTEGER DEFAULT 0,
    gallery_images TEXT, -- Stored as stringified JSON array of URLs
    variants TEXT, -- Stored as stringified JSON object/array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    icon_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCT_CATEGORIES (Pivot / Junction Table)
CREATE TABLE IF NOT EXISTS product_categories (
    product_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    division TEXT,
    district TEXT,
    upazila TEXT,
    address TEXT,
    items TEXT, -- Stored as stringified JSON array of cart items
    addons TEXT, -- Can be comma separated string or JSON
    subtotal REAL DEFAULT 0,
    addon_total REAL DEFAULT 0,
    delivery_charge REAL DEFAULT 0,
    promo_code TEXT,
    promo_discount REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    advance_payable REAL DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Unpaid',
    payment_trx_id TEXT,
    payment_sender TEXT,
    status TEXT DEFAULT 'Pending',
    order_type TEXT DEFAULT 'delivery',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. BANNERS TABLE
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title TEXT,
    image_url TEXT NOT NULL,
    link TEXT,
    link_type TEXT,
    type TEXT,
    target TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROMO_CODES TABLE
CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount REAL DEFAULT 0,
    type TEXT,
    expiry TEXT,
    max_cap REAL,
    min_spend REAL,
    del_reward TEXT,
    del_disc_amount REAL,
    del_disc_cap REAL,
    applicable_products TEXT, -- JSON array of product IDs
    applicable_categories TEXT, -- JSON array of category IDs
    applicable_districts TEXT, -- JSON array of district names
    applicable_payments TEXT, -- JSON array of payment methods
    is_active INTEGER DEFAULT 1,
    is_repeated_config INTEGER DEFAULT 0,
    rep_type TEXT,
    rep_value REAL,
    rep_cap REAL,
    rep_expiry_days INTEGER,
    rep_min_spend REAL,
    rep_del_reward TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. ADDONS TABLE
CREATE TABLE IF NOT EXISTS addons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    icon_type TEXT,
    icon_url TEXT,
    svg_code TEXT,
    lottie_url TEXT,
    type TEXT,
    price REAL DEFAULT 0,
    description TEXT,
    fields TEXT, -- JSON string representation of extra config
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. DELIVERY_ZONES TABLE
CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fee REAL DEFAULT 0,
    districts TEXT, -- JSON stringified array
    cod_enabled INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    customer_name TEXT,
    rating INTEGER DEFAULT 5,
    comment TEXT,
    images TEXT, -- JSON stringified array of URLs
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 11. HOME_SECTIONS TABLE
CREATE TABLE IF NOT EXISTS home_sections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT,
    category_id TEXT,
    product_ids TEXT, -- JSON stringified array of IDs
    max_products INTEGER DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. VERIFIED_PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS verified_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL DEFAULT 0,
    trx_id TEXT,
    gateway TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 13. DEVTOOLS TABLE
CREATE TABLE IF NOT EXISTS devtools (
    id TEXT PRIMARY KEY,
    code TEXT,
    config TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. ADMINS TABLE
-- For your custom Auth provider via cf_db logic
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'admin',
    wallet_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Implementation Notes for Custom API (Cloudflare Workers + D1)

*   **JSON Fields**: Cloudflare D1 relies strictly on standard SQLite types (`TEXT`, `INTEGER`, `REAL`, `BLOB`). Since there's no native JSON datatype, you must run `JSON.stringify()` on your arrays (like `gallery_images`, `applicable_districts`, `telegram_main_chats`) before inserting them. When querying from D1 via your API, parse them with `JSON.parse()`.
*   **Booleans**: SQLite handles boolean values as integers (`1` for true, `0` for false). The frontend is already passing boolean evaluations which your API router will need to cast or just directly store as `0`/`1`.
*   **IDs**: You'll notice `TEXT PRIMARY KEY` is used for almost all `id` fields. Since Appwrite and Supabase usually employ either UUID strings or auto-generated alphanumerics, your `cf_db` API will have to generate these (e.g. `crypto.randomUUID()`) when inserting new rows.
