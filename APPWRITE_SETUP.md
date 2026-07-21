# Appwrite Full Setup Guide
## Supabase → Appwrite Migration — সম্পূর্ণ সেটআপ গাইড

---

## 🔑 Step 1: Cloudflare Environment Variables

Cloudflare Dashboard → Pages → আপনার প্রজেক্ট → Settings → Environment Variables এ এই ভ্যালুগুলো সেট করুন:

```
DB_PROVIDER                          = appwrite

APPWRITE_ENDPOINT                    = https://cloud.appwrite.io/v1
APPWRITE_PROJECT                     = (আপনার Project ID)
APPWRITE_API_KEY                     = (Server API Key — সব permission সহ)
APPWRITE_DATABASE_ID                 = (Database ID)

APPWRITE_COLLECTION_SETTINGS         = (settings collection এর ID)
APPWRITE_COLLECTION_PRODUCTS         = (products collection এর ID)
APPWRITE_COLLECTION_CATEGORIES       = (categories collection এর ID)
APPWRITE_COLLECTION_BANNERS          = (banners collection এর ID)
APPWRITE_COLLECTION_ORDERS           = (orders collection এর ID)
APPWRITE_COLLECTION_ADDONS           = (addons collection এর ID)
APPWRITE_COLLECTION_PROMOS           = (promos collection এর ID)
APPWRITE_COLLECTION_REVIEWS          = (reviews collection এর ID)
APPWRITE_COLLECTION_HOME_SECTIONS    = (home_sections collection এর ID)
APPWRITE_COLLECTION_PRODUCT_CATEGORIES = (product_categories collection এর ID)
APPWRITE_COLLECTION_VERIFIED_PAYMENTS = (verified_payments collection এর ID)
APPWRITE_COLLECTION_DELIVERY_ZONES   = (delivery_zones collection এর ID)
```

---

## 🗄️ Step 2: Appwrite Database তৈরি করুন

Appwrite Console → Databases → **Create Database**
- Name: `ecommerce` (যেকোনো নাম)
- Database ID: যেকোনো (এটাই `APPWRITE_DATABASE_ID`)

---

## 📂 Collections সেটআপ

প্রতিটি Collection-এর জন্য:
1. Database → **Create Collection**
2. Collection ID সেট করুন (Cloudflare ENV এ বসাবেন)
3. **Permissions** ট্যাবে গিয়ে: **"Any"** কে `Read`, `Create`, `Update`, `Delete` সব দিন
4. **Attributes** ট্যাবে গিয়ে নিচের লিস্ট অনুযায়ী প্রতিটি attribute তৈরি করুন
5. **Indexes** ট্যাবে গিয়ে নিচের indexes তৈরি করুন

---

## 1️⃣ `settings` Collection

> ⚠️ এই collection-এ মাত্র **১টি** document থাকবে (id=1 এর মতো)। সব সেটিংস একটি row-এ।

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `store_name` | String | 200 | No | `` |
| `logo_url` | String | 1000 | No | `` |
| `favicon_url` | String | 1000 | No | `` |
| `whatsapp_number` | String | 20 | No | `` |
| `footer_text` | String | 500 | No | `` |
| `bkash_number` | String | 20 | No | `` |
| `nagad_number` | String | 20 | No | `` |
| `allow_cod` | Boolean | — | No | false |
| `advance_amount` | Integer | — | No | 0 |
| `allow_whatsapp_order` | Boolean | — | No | false |
| `allow_msg_order` | Boolean | — | No | false |
| `messaging_apps` | String | 5000 | No | `[]` |
| `allow_pickup` | Boolean | — | No | false |
| `pickup_bot_token` | String | 200 | No | `` |
| `pickup_chat_id` | String | 100 | No | `` |
| `store_address` | String | 500 | No | `` |
| `store_map_link` | String | 1000 | No | `` |
| `telegram_main_bot` | String | 200 | No | `` |
| `telegram_main_chats` | String | 500 | No | `` |
| `telegram_draft_bot` | String | 200 | No | `` |
| `draft_chat` | String | 100 | No | `` |
| `gateway_proxy_url` | String | 1000 | No | `` |
| `gateway_api_key` | String | 200 | No | `` |
| `maintenance_mode` | Boolean | — | No | false |
| `maintenance_message` | String | 1000 | No | `` |
| `review_imgbb_key` | String | 200 | No | `` |
| `binance_api_key` | String | 200 | No | `` |
| `binance_api_secret` | String | 200 | No | `` |
| `verify_mode` | String | 50 | No | `cloudflare` |
| `custom_css` | String | 50000 | No | `` |

### Indexes: (কোনো index দরকার নেই — মাত্র ১টি document)

---

## 2️⃣ `products` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `name` | String | 500 | **Yes** | — |
| `description` | String | 50000 | No | `` |
| `base_price` | Integer | — | **Yes** | — |
| `flash_sale_price` | Integer | — | No | 0 |
| `sku` | String | 200 | No | `` |
| `category_id` | String | 50 | No | `` |
| `gallery_images` | String | 20000 | No | `[]` |
| `variants` | String | 50000 | No | `[]` |
| `video_url` | String | 1000 | No | `` |
| `video_type` | String | 50 | No | `auto` |
| `is_active` | Boolean | — | No | true |
| `sort_order` | Integer | — | No | 0 |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_name` | Fulltext | `name` |
| `idx_is_active` | Key | `is_active` |
| `idx_sort_order` | Key | `sort_order` |

---

## 3️⃣ `categories` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `name` | String | 200 | **Yes** | — |
| `icon` | String | 500 | No | `` |
| `image_url` | String | 1000 | No | `` |
| `sort_order` | Integer | — | No | 0 |
| `is_active` | Boolean | — | No | true |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_sort_order` | Key | `sort_order` |
| `idx_is_active` | Key | `is_active` |

---

## 4️⃣ `banners` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `image_url` | String | 1000 | **Yes** | — |
| `link` | String | 500 | No | `` |
| `sort_order` | Integer | — | No | 0 |
| `is_active` | Boolean | — | No | true |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_sort_order` | Key | `sort_order` |
| `idx_is_active` | Key | `is_active` |

---

## 5️⃣ `orders` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `customer_name` | String | 200 | **Yes** | — |
| `customer_phone` | String | 20 | **Yes** | — |
| `customer_email` | String | 200 | No | `` |
| `division` | String | 100 | No | `` |
| `district` | String | 100 | No | `` |
| `upazila` | String | 100 | No | `` |
| `address` | String | 1000 | No | `` |
| `items` | String | 50000 | **Yes** | — |
| `addons` | String | 5000 | No | `[]` |
| `subtotal` | Integer | — | No | 0 |
| `addon_total` | Integer | — | No | 0 |
| `delivery_charge` | Integer | — | No | 0 |
| `promo_code` | String | 100 | No | `` |
| `promo_discount` | Integer | — | No | 0 |
| `grand_total` | Integer | — | No | 0 |
| `advance_payable` | Integer | — | No | 0 |
| `payment_method` | String | 50 | No | `COD` |
| `payment_status` | String | 50 | No | `Unpaid` |
| `payment_trx_id` | String | 300 | No | `` |
| `status` | String | 50 | No | `Pending` |
| `order_type` | String | 50 | No | `delivery` |
| `note` | String | 2000 | No | `` |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_customer_phone` | Key | `customer_phone` |
| `idx_status` | Key | `status` |
| `idx_payment_status` | Key | `payment_status` |
| `idx_payment_trx_id` | Unique | `payment_trx_id` |

---

## 6️⃣ `addons` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `name` | String | 200 | **Yes** | — |
| `price` | Integer | — | **Yes** | — |
| `icon` | String | 200 | No | `` |
| `is_active` | Boolean | — | No | true |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_is_active` | Key | `is_active` |

---

## 7️⃣ `promos` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `code` | String | 100 | **Yes** | — |
| `discount` | Integer | — | No | 0 |
| `discount_type` | String | 50 | No | `fixed` |
| `min_order` | Integer | — | No | 0 |
| `min_quantity` | Integer | — | No | 0 |
| `min_amount` | Integer | — | No | 0 |
| `expires_at` | String | 50 | No | `` |
| `is_active` | Boolean | — | No | true |
| `applicable_to` | String | 50 | No | `all` |
| `product_ids` | String | 5000 | No | `[]` |
| `category_ids` | String | 5000 | No | `[]` |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_code` | Unique | `code` |
| `idx_is_active` | Key | `is_active` |

---

## 8️⃣ `reviews` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `product_id` | String | 50 | **Yes** | — |
| `customer_name` | String | 200 | **Yes** | — |
| `customer_phone` | String | 20 | No | `` |
| `rating` | Integer | — | **Yes** | — |
| `comment` | String | 5000 | No | `` |
| `image_url` | String | 1000 | No | `` |
| `is_approved` | Boolean | — | No | false |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_product_id` | Key | `product_id` |
| `idx_is_approved` | Key | `is_approved` |

---

## 9️⃣ `home_sections` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `title` | String | 300 | **Yes** | — |
| `type` | String | 50 | No | `category` |
| `category_id` | String | 50 | No | `` |
| `product_ids` | String | 5000 | No | `[]` |
| `max_products` | Integer | — | No | 10 |
| `sort_order` | Integer | — | No | 0 |
| `is_active` | Boolean | — | No | true |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_sort_order` | Key | `sort_order` |
| `idx_is_active` | Key | `is_active` |

---

## 🔟 `product_categories` Collection

> এটি Products ↔ Categories এর Many-to-Many junction table।

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `product_id` | String | 50 | **Yes** | — |
| `category_id` | String | 50 | **Yes** | — |

### Indexes:
| Index Name | Type | Attributes |
|------------|------|------------|
| `idx_product_id` | Key | `product_id` |
| `idx_category_id` | Key | `category_id` |
| `idx_unique_pair` | Unique | `product_id`, `category_id` |

---

## 1️⃣1️⃣ `verified_payments` Collection

> Binance Pay / Crypto double-spend protection।

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `transaction_id` | String | 300 | **Yes** | — |
| `order_id` | String | 100 | **Yes** | — |
| `amount` | Float | — | No | 0 |
| `currency` | String | 20 | No | `` |
| `method` | String | 50 | No | `` |
| `coin` | String | 20 | No | `` |
| `network` | String | 50 | No | `` |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_transaction_id` | Unique | `transaction_id` |
| `idx_order_id` | Key | `order_id` |

---

## 1️⃣2️⃣ `delivery_zones` Collection

### Attributes:
| Key | Type | Size | Required | Default |
|-----|------|------|----------|---------|
| `zone_name` | String | 200 | **Yes** | — |
| `districts` | String | 5000 | No | `[]` |
| `charge` | Integer | — | **Yes** | — |
| `is_active` | Boolean | — | No | true |

### Indexes:
| Index Name | Type | Attribute |
|------------|------|-----------|
| `idx_is_active` | Key | `is_active` |

---

## ✅ Step 3: API Key তৈরি করুন

Appwrite Console → **API Keys** → Create API Key
- Name: `ecommerce-server`
- **Scopes সব দিন** (databases.read, databases.write, collections.read, documents.read, documents.write, documents.delete)
- এই key টি `APPWRITE_API_KEY` হিসেবে Cloudflare-এ সেট করুন

---

## 🔄 Step 4: DB Switch করার নিয়ম

### Supabase → Appwrite:
Cloudflare Dashboard → Pages → Settings → Environment Variables:
```
DB_PROVIDER = appwrite
```
তারপর **Redeploy** দিন।

### Appwrite → Supabase:
```
DB_PROVIDER = supabase
```
তারপর **Redeploy** দিন।

---

## ⚠️ গুরুত্বপূর্ণ নোট

1. **JSON Fields:** `variants`, `gallery_images`, `items`, `addons`, `messaging_apps`, `product_ids`, `category_ids`, `districts` — এগুলো Appwrite-এ String হিসেবে স্টোর হবে। `master-db.js` স্বয়ংক্রিয়ভাবে serialize/deserialize করবে।

2. **settings এর id:** Supabase-এ settings row এর id=1 ছিল। Appwrite-এ প্রথম document তৈরি করার সময় Document ID হিসেবে `1` দিন — তাহলে সব কোড আগের মতোই কাজ করবে।

3. **Image Storage:** Appwrite Storage ব্যবহার করতে পারবেন অথবা ImgBB/Cloudinary URL সরাসরি String হিসেবে রাখতে পারবেন (বর্তমান সিস্টেম)।
