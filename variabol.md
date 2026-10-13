# প্রজেক্ট এনভায়রনমেন্ট ভ্যারিয়েবল (Environment Variables)

প্রজেক্টটি (ফ্রন্টএন্ড এবং পেমেন্ট ব্যাকএন্ড) সঠিকভাবে চালানোর জন্য নিচের ভ্যারিয়েবলগুলো Cloudflare ড্যাশবোর্ড, `.env` ফাইল বা হোস্টিং সার্ভারে সেট আপ করতে হবে।

---

## ০. সাইট টেমপ্লেট ও ডিজাইন ভার্সন নির্বাচন (Site Template Version)
হোমপেজের ডিজাইন বা ভার্সন Cloudflare ড্যাশবোর্ডের এনভায়রনমেন্ট ভ্যারিয়েবল দিয়ে নির্বাচন করতে পারেন:

*   **`TEMPLATE_VERSION`** (বা **`VERSION`**) :
    *   **মান:** `v1` অথবা `v2` (ডিফল্ট: `v1`)
    *   **`v1` দিলে:** ক্লাসিক পরিচ্ছন্ন ই-কমার্স লেআউট (Classic Style) লোড হবে।
    *   **`v2` দিলে:** প্রিমিয়াম আধুনিক টেইলউইন্ড লেআউট (Modern Tailwind Style) লোড হবে।
    *   **কোথায় সেট করবেন:** Cloudflare Pages > Settings > Environment variables এ গিয়ে ভ্যারিয়েবল হিসেবে `TEMPLATE_VERSION` দিন এবং ভ্যালু হিসেবে `v1` বা `v2` দিন।

---

## ০.১ ব্র্যান্ড কালার নির্বাচন (Brand Colors Variable)
গিটহাবে পুশ বা কোড পরিবর্তন ছাড়া সরাসরি কালার সেট করতে:

*   **`BRAND_COLORS`** (বা **`THEME_COLORS`**) :
    *   **কোড পাওয়ার নিয়ম:** অ্যাডমিন প্যানেল থেকে **Theme Customizer** (`/admin/theme.html`) এ গিয়ে নিজের মতো কালার সিলেক্ট করুন এবং **"📋 Generate Brand Color Code"** বাটনে ক্লিক করুন। একটি পপআপ আসবে যাতে লেখা থাকবে *"Please send this text to the developer"*। সেখান থেকে কোডটি কপি করে নিন।
    *   **মান:** জেনারেট হওয়া JSON কোড (যেমন: `{"primary":"#8B1A1A","primary_light":"#B03535",...}`)
    *   **কোথায় সেট করবেন:** Cloudflare Pages > Settings > Environment variables এ গিয়ে ভ্যারিয়েবল নাম `BRAND_COLORS` দিয়ে ভ্যালুটি পেস্ট করুন। সাইট স্বয়ংক্রিয়ভাবে লাইভ এই কালার গ্রহণ করবে।

---

## ১. সাধারণ ও সিকিউরিটি ভ্যারিয়েবল (সব ডেটাবেসের জন্য আবশ্যিক)
আপনি যে ডেটাবেসই ব্যবহার করুন না কেন, অ্যাডমিন প্যানেল, API সিকিউরিটি এবং পেমেন্ট ব্যাকএন্ডের জন্য এই ভ্যারিয়েবলগুলো সেট করা প্রয়োজন।

*   **`ADMIN_USERNAME`** : অ্যাডমিন প্যানেলে লগিন করার ইউজারনেম (ডিফল্ট: admin)।
*   **`ADMIN_PASSWORD`** : অ্যাডমিন প্যানেলের পাসওয়ার্ড (ডিফল্ট: 1234)।
*   **`ADMIN_SECRET_TOKEN`** : অ্যাডমিন প্যানেলের API রিকোয়েস্ট অথেনটিকেশনের জন্য একটি সিক্রেট টোকেন (যেমন: my_secret_token_123)।
*   **`PORT`** : ব্যাকএন্ড সার্ভারের পোর্ট (যেমন: 7860)।
*   **`NODE_ENV`** : এনভায়রনমেন্ট মোড (যেমন: development বা production)।
*   **`BINANCE_API_KEY`** : Binance Pay API-এর অ্যাক্সেস কি।
*   **`BINANCE_SECRET_KEY`** : Binance Pay API-এর সিক্রেট কি (বা `BINANCE_API_SECRET`)।

---

## ২. ফাইল/ইমেজ আপলোডের জন্য (Cloudflare R2)
প্রোডাক্টের ছবি বা যেকোনো ফাইল আপলোড করার জন্য Cloudflare R2 স্টোরেজ কনফিগার করতে হবে। 

*   **`R2_ACCOUNT_ID`** : আপনার Cloudflare অ্যাকাউন্ট আইডি।
*   **`R2_BUCKET_NAME`** : R2 তে তৈরি করা বাকেটের নাম।
*   **`R2_ACCESS_KEY_ID`** : R2 এর অ্যাক্সেস কি (Access Key)।
*   **`R2_SECRET_ACCESS_KEY`** : R2 এর সিক্রেট কি (Secret Key)।
*   **`R2_PUBLIC_URL`** : আপলোড করা ইমেজের পাবলিক ডোমেইন লিংক বা URL।

---

## ৩. ডেটাবেস-ভিত্তিক ভ্যারিয়েবল (Database-based Variables)
আপনি কোন ডেটাবেস ব্যবহার করবেন তার ওপর ভিত্তি করে নিচের নির্দিষ্ট ভ্যারিয়েবলগুলো সেট করতে হবে।

### ক. Cloudflare D1 (cf_db) এর জন্য:
Cloudflare D1 ডেটাবেসের ক্ষেত্রে কোনো সিক্রেট কি লাগে না, এর পরিবর্তে **Binding** করতে হয়।
*   **`DB`** : এটি D1 ডেটাবেসের Binding Name। Cloudflare ড্যাশবোর্ডে গিয়ে আপনার তৈরি করা D1 ডেটাবেসটিকে `DB` নামে বাইন্ড করতে হবে (যাতে কোডে `env.DB` হিসেবে অ্যাক্সেস করা যায়)।

### খ. Supabase এর জন্য:
*   **`DB_PROVIDER`** : `supabase` সেট করতে হবে।
*   **`SUPABASE_URL`** : আপনার Supabase প্রজেক্টের URL (যেমন: https://your-project-id.supabase.co)।
*   **`SUPABASE_SERVICE_KEY`** : Supabase-এর Service Role Key (ডেটাবেসে রাইট অ্যাক্সেসের জন্য)।

### গ. Appwrite এর জন্য:
*   **`DB_PROVIDER`** : `appwrite` সেট করতে হবে।
*   **`APPWRITE_ENDPOINT`** : Appwrite API এন্ডপয়েন্ট (যেমন: https://sgp.cloud.appwrite.io/v1)।
*   **`APPWRITE_PROJECT`** : Appwrite প্রজেক্ট আইডি।
*   **`APPWRITE_API_KEY`** : Appwrite API কি।
*   **`APPWRITE_DATABASE_ID`** : Appwrite ডেটাবেস আইডি (যেমন: 6a19e07f002427086405)।
*   **`APPWRITE_COLLECTION_VERIFIED_PAYMENTS`** : পেমেন্ট ভেরিফিকেশন কালেকশনের নাম (যেমন: verified_payments)।

---

## ৪. অন্যান্য ঐচ্ছিক ভ্যারিয়েবলসমূহ (Optional Variables)
প্রজেক্টের কিছু নির্দিষ্ট ফিচারের ওপর ভিত্তি করে নিচের ভ্যারিয়েবলগুলো প্রয়োজন হতে পারে:

**ক্যাশ ক্লিয়ার (Cache Purging) করার জন্য:**
*   **`CLOUDFLARE_ZONE_ID`** : আপনার ডোমেইনের জোন আইডি।
*   **`CLOUDFLARE_API_TOKEN`** : ক্যাশ ক্লিয়ার করার পারমিশন সহ Cloudflare এপিআই টোকেন।

**সার্ভার-সাইড ট্র্যাকিং (Server-side Tracking) এর জন্য:**
*   **`META_API_TOKEN`** : Facebook Pixel/Conversions API-এর জন্য।
*   **`GA4_API_SECRET`** : Google Analytics 4 Measurement Protocol-এর জন্য।

**গিটহাবের সাথে সিঙ্ক (GitHub Sync) করার জন্য:**
*   **`GITHUB_TOKEN`** : আপনার গিটহাব অ্যাকাউন্টের পারসোনাল অ্যাক্সেস টোকেন (PAT)।
*   **`GITHUB_OWNER`** : গিটহাব ইউজারনেম (যেমন: piyeshproject-stack)।
*   **`GITHUB_REPO`** : গিটহাব রিপোজিটরির নাম (যেমন: piyeshproject)।
