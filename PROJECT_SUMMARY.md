# 📦 Freelancing By Rifat E-Commerce Project
## সম্পূর্ণ প্রজেক্ট সামারি (Story-Based)

---

## 🔰 প্রজেক্ট পরিচিতি

এই প্রজেক্টটি হলো একটি সম্পূর্ণ E-Commerce ওয়েবসাইট যা বাংলাদেশের জন্য তৈরি করা হয়েছে। এখানে গ্রাহকরা ঘরে বসে অর্ডার করতে পারবেন, বিকাশ বা নগদ দিয়ে পেমেন্ট করতে পারবেন, এবং ঘরে বসে অর্ডার ট্র্যাক করতে পারবেন। প্রজেক্টটি Supabase নামে একটি Backend Service ব্যবহার করে যা মূলত Firebase এর মতোই কাজ করে কিন্তু এটি PostgreSQL এর উপর ভিত্তি করে তৈরি। এখানে সব ডাটা সার্ভারে সেভ থাকে এবং ইন্টারনেট থাকলে যেকোনো জায়গা থেকে অ্যাক্সেস করা যায়। প্রজেক্টটি PWA (Progressive Web App) সাপোর্টেড অর্থাৎ এটি ইন্টারনেট না থাকলেও কিছু কিছু ফিচার কাজ করবে।

**Tech Stack:**
ফ্রন্টএন্ডে কোনো React বা Vue ব্যবহার করা হয়নি, সরাসরি Vanilla JavaScript ব্যবহার করা হয়েছে যাতে ওয়েবসাইট দ্রুত লোড হয়। স্টাইলের জন্য CSS ব্যবহার করা হয়েছে এবং আইকনের জন্য Lucide Icons ব্যবহার করা হয়েছে। ব্যাকএন্ডে Supabase ব্যবহার করা হয়েছে যা ডাটাবেস, অথেনটিকেশন এবং ফাইল স্টোরেজ এর জন্য কাজ করে। পেমেন্ট এর জন্য bKash এবং Nagad এর Payment Gateway ব্যবহার করা হয়েছে যা একটি Proxy Server এর মাধ্যমে কাজ করে। অর্ডার নোটিফিকেশন এর জন্য Telegram Bot ব্যবহার করা হয়েছে।

---

## 🌐 ফ্রন্টএন্ড পার্ট (Customer Facing Pages)

### হোম পেজ (index.html)

index.html হলো ওয়েবসাইটের প্রথম পেজ যা ইউজাররা সবার আগে দেখে। যখন কেউ ওয়েবসাইটে ঢুকে, তখন সে সবার আগে একটি Loader দেখে যেটা সেকেন্ড খানেক লোড হয়। তারপর হোম পেজে একটি Hero Slider দেখা যায় যেখানে ব্যানার ইমেজ স্লাইড করে। তারপর নিচে Categories এর একটি লিস্ট আছে যেখানে বিভিন্ন ক্যাটাগরির নাম আছে যেমন: ক্লথিং, ইলেকট্রনিক্স, গার্মেন্টস ইত্যাদি। ক্যাটাগরি তে ক্লিক করলে শুধু সেই ক্যাটাগরির প্রোডাক্ট দেখা যায়। তারপর Flash Deals নাম�� একটি সেকশন আছে যেখানে সময় সীমিত অফার দেওয়া থাকে এবং টাইমার কাউন্টডাউন দেখায়। তারপর সব প্রোডাক্ট গ্রিড আছে যেখানে সব প্রোডাক্ট কার্ড আকারে দেখানো হয়। প্রতিটি কার্ডে প্রোডাক্টের ছবি, নাম, দাম এবং একটি "Add to Cart" বাটন আছে। উপরের ন্যাভবারে সার্চ বক্স আছে যেখানে লাইভ সার্চ করা যায় অর্থাৎ কিছু টাইপ করলেই প্রোডাক্ট ফিল্টার হয়ে যায়। ডান পাশে কার্ট আইকন আছে যেখানে কার্টে কতগুলো প্রোডাক্ট আছে সেই সংখ্যা ব্যাজে দেখায়।

এই পেজের প্রধান ফাংশনগুলো হলো: initHome() যেটা পেজ লোড হলে সেটিংস, ব্যানার এবং প্রোডাক্ট লোড করে, liveSearch() যেটা সার্চ বক্সে টাইপ করলে রিয়েল-টাইমে প্রোডাক্ট ফিল্টার করে, addToCart() যেটা প্রোডাক্ট কার্টে যোগ করে এবং localStorage এ সেভ করে, updateCartBadge() যেটা কার্টের প্রোডাক্ট সংখ্যা আপডেট করে, এবং showToast() যেটা "Added to cart!" মেসেজ দেখায়।

### শপ পেজ (shop.html)

shop.html হলো পেজ যেখানে সব প্রোডাক্ট একসাথে দেখা যায় এবং ফিল্টার করা যায়। বাম দিকে একটি Sidebar আছে যেখানে Categories এর লিস্ট আছে, Price Range এর জন্য Min এবং Max ইনপুট বক্স আছে, সর্ট করার জন্য Dropdown আছে (Newest First, Price Low to High, Price High to Low, On Sale First)। এছাড়া Flash Deals Only চেকবক্স আছে যেটা সিলেক্ট করলে শুধু flash deal প্রোডাক্ট দেখায়। ডান দিকে প্রোডাক্ট গ্রিড আছে। মোবাইলে Sidebar লুকিয়ে থাকে এবং ফিল্টার বক্স পৃথক জায়গায় দেখায়।

প্রধান ফাংশনগুলো হলো: renderProducts() যেটা প্রোডাক্ট গ্রিড তৈরি করে, selectCat() যেটা ক্যাটাগরি সিলেক্ট করলে ফিল্টার করে, applyFilters() যেটা সব ফিল্টার (ক্যাটাগরি, প্রাইস, সর্ট, ফ্ল্যাশ ডিল) একসাথে প্রয়োগ করে।

### প্রোডাক্ট ডিটেইল পেজ (product.html)

product.html হলো একটি নির্দিষ্ট প্রোডাক্টের সব তথ্য দেখানোর পেজ। URL এ product.html?id=XXX এভাবে আইডি পাঠিয়ে লোড করা হয়। বাম দিকে ছবির গ্যালারি আছে যেখানে মূল ছবি বড় এবং তার নিচে থাম্বনেইল ছবি আছে। ছবির উপর ক্লিক করলে মূল ছবি পরিবর্তন হয়। ডান দিকে প্রোডা���্টের নাম, দাম (বর্তমান দাম লাল/rgba রঙে এবং পুরোনো দাম কাটা করে দেখানো থাকে), ডিসকাউন্ট লেবেল (যদি সেলে থাকে), রেটিং এবং রিভিউ সংখ্যা দেখায়। তারপর বিবরণ (Description) আছে। তারপর Color সিলেক্ট করার জন্য গোল গোল সোয়াচ আছে যেখানে বিভিন্ন কালার এর পয়েন্ট আছে এবং ক্লিক করলে সেই কালার সিলেক্ট হয়। তারপর Size সিলেক্ট করার জন্য বাটন আছে যেমন S, M, L, XL এবং প্রতিটি বাটনের স্টক আছে কিনা দেখায় (যদি স্টক নেই থাকলে বাটন অক্ষম থাকবে)। তারপর Quantity সিলেক্ট করার জন্য +/- বাটন আছে এবং সংখ্যা লেখা আছে। সবশেষে "Add to Cart" বাটন আছে।

প্রধান ফাংশনগুলো হলো: loadProduct() যেটা URL থেকে আইডি নিয়ে Supabase থেকে প্রোডাক্ট ডাটা লোড করে, selectColor() যেটা কালার সিলেক্ট করলে লেবেল আপডেট করে এবং কালার ভেরিয়েবল সেভ করে, selectSize() যেটা সাইজ সিলেক্ট করলে স্টক চেক করে এবং সাইজ ভেরিয়েবল সেভ করে, updateQty() যেটা পরিমাণ বাড়ায় বা কমায়, addToCart() যেটা সব তথ্য (প্রোডাক্ট আইডি, নাম, ছবি, দাম, কালার, সাইজ, কোয়ান্টি) নিয়ে localStorage এ কার্টে সেভ করে। যদি একই প্রোডাক্ট (আইডি+কালার+সাইজ) আগে থেকে থাকে তাহলে কোয়ান্টি বাড়ায়।

### কার্ট পেজ (cart.html)

cart.html হলো যেখানে কার্টে যোগ করা সব প্রোডাক্ট দেখা যায়। এখানে প্রতিটি প্রোডাক্টের ছবি, নাম, কালার/সাইজ, দাম, পরিমাণ (+/- বাটন) এবং রিমুভ বাটন আছে। ডান দিকে Order Summary আছে যেখানে Subtotal, Delivery (চেকআউট এ হিসাব হবে), Promo Code ইনপুট এবং "Proceed to Checkout" বাটন আছে। এখানে Promo Code এর জন্য Apply বাটন আছে এবং যদি প্রোমো ভ্যালিড হয় তাহলে Discount দেখাবে।

প্রধান ফাংশনগুলো হলো: getCart() যেটা localStorage থেকে 'fbr_cart' কী দিয়ে কার্ট অ্যারে লোড করে, saveCart() যেটা কার্ট অ্যারে localStorage এ সেভ করে, renderCart() যেটা কার্ট আইটেম গুলো HTML তৈরি করে দেখায়, updateQty() যেটা কোয়ান্টি বাড়ায় বা কমায় (লোয়েস্ট 1), removeItem() যেটা প্রোডাক্ট রিমুভ করে, applyPromo() যেটা প্রোমো কোড চেক করে এবং প্রোমো ডিসকাউন্ট হিসাব করে, updateSummary() যেটা মোট দাম আ��ড��ট করে।

### চেকআউট পেজ (checkout.html) - সবচেয়ে গুরুত্বপূর্ণ

checkout.html হলো সবচেয়ে গুরুত্বপূর্ণ পেজ কারণ এখানেই অর্ডার হয় এবং পেমেন্ট হয়। এটা ৩ স্টেপে ভাগ করা:

**স্টেপ ১: কাস্টমার তথ্য**
এখানে কাস্টমার এর নাম, ফোন নম্বর এবং ইমেইল ইনপুট নিতে হয়। নাম এবং ফোন বাধ্যতামূলক, ইমেইল ঐচ্ছিক। ফোন নম্বর অবশ্যই ১১ সংখ্যার হতে হবে এবং 01 দিয়ে শুরু হতে হবে। এই তথ্য Supabase এ সেভ হবে না, পরে অর্ডার এর সাথে সেভ হবে।

**স্টেপ ২: ডেলিভারি তথ্য**
এখানে Division (বিভাগ), District (জেলা), Upazila (উপজেলা), পূর্ণ ঠিকানা ইনপুট নিতে হয়। Division সিলেক্ট করলে District লোড হয়, District সিলেক্ট করলে Upazila লোড হয়। এই ডাটা bdapis.com নামে একটি বাংলাদেশ API থেকে লোড হয়। তারপর ডেলিভারি চার্জ দেখায় যেটা District অনুযায়ী চেক করা হয় (Supabase এর delivery_zones টেবিল থেকে)। তারপর Addons দেখায় যেমন: Gift Wrap, Express Delivery ইত্যাদি (ঐচ্ছিক)। Addons সিলেক্ট করলে খরচ বাড়ে।

**স্টেপ ৩: পেমেন্ট মেথড**
এখানে পেমেন্ট মেথড সিলেক্ট করতে হয়:
- bKash (Manual) - কাস্টমার নিজে bKash এ টাকা ���াঠায় এবং TrxID দেয়
- Nagad (Manual) - কাস্টমার নিজে Nagad এ টাকা পাঠায় এবং TrxID দেয়
- COD (Cash on Delivery) - পণ্য পেলে টাকা দেয়
- Online Payment (Gateway) - বটন ক্লিক করলে গেটওয়ে পেজে রিডিরেক্ট হয় এবং সেখানে পেমেন্ট করে

bKash বা Nagad সিলেক্ট করলে Sender Number এবং Transaction ID ইনপুট দিতে হয়। Online Payment সিলেক্ট করলে অর্ডার আগে ডাটাবেসে সেভ হয় (status: Pending, payment_status: Unpaid), তারপর গেটওয়ে পেজে রিডিরেক্ট হয়। গেটওয়ে পেমেন্ট সফল হলে ?status=completed&order_id=XXX&transaction_id=XXX প্যারামিটার নিয়ে ফিরে আসে। তখন verifyGatewayPayment() ফাংশন কাজ করে।

**Payment Verification (সবচেয়ে গুরুত্বপূর্ণ পরিবর্তন):**
যখন পেমেন্ট গেটওয়ে থেকে ফিরে আসে, তখন verifyGatewayPayment() ফাংশন কাজ করে:
১. প্রথমে "Verifying your payment securely..." লোডিং দেখায়
২. অর্ডার আছে কিনা চেক করে
৩. অর্ডার আগে থেকে পেইড (Paid/Advance Paid) কিনা চেক করে - যদি পেইড থাকে তাহলে সরাসরি success পেজে পাঠায়
৪. এটাই নতুন: Duplicate TrxID চেক করে - অন্য অর্ডারে এই TrxID আগে ব্যবহার হয়েছে কিনা দেখে, যদি হয় তাহলে ERROR দেয়!
৫. Payment Gateway Proxy তে verify request পাঠায় (transaction_id পাঠিয়ে)
৬. যদি verify সফল হয় (status: COMPLETED/SUCCESS/VALID) তাহলে:
   - payment_status আপডেট করে "Paid" বা "Advance Paid"
   - payment_trx_id সেভ করে
   - status আপডেট করে "Confirmed"
   - Telegram এ নোটিফিকেশন পাঠায় (নতুন অর্ডার!)
৭. যদি verify FAIL হয় তাহলে ERROR মেসেজ দেয়

এই verification ছাড়া কেউ যদি একই TrxID দিয়ে দুইবার পেমেন্ট করতে চাইত, সেটা আগে হতো কিন্তু এখন BLOCK হয়ে যাবে!

**Order Place এর পর:**
placeOrder() ফাংশন সব ডাটা নিয়ে Supabase এর orders টেবিলে insert করে এবং localStorage থেকে কার্ট clear করে। তারপর sendOrderNotification() ফাংশন কাজ করে যেটা Telegram Bot দিয়ে অর্ডারের নোটিফিকেশন পাঠায় অ্যাডমিন চ্যাটে।

প্রধান ফাংশনগুলো হলো: initCheckout() যেটা সেটিংস, ডেলিভারি জোন, অ্যাডঅনস, প্রোমো কোড লোড করে, loadBdDivisions(), loadDistricts(), loadUpazilas() যেগুলো BD API থেকে লোড করে, calcDelivery() যেটা জেলা অনুযায়ী ডেলিভারি চার্জ হিসাব করে, buildPaymentOptions() যেটা সেটিংস অনুযায়ী পেমেন্ট অপশন রেন্ডার করে, selectPayment() যেটা পেমেন্ট মেথড সিলেক্ট করলে Manual PaymentBox দেখায় বা লুকায়, placeOrder() যেটা অর্ডার সেভ করে এবং পেমেন্ট ফ্লো শুরু করে, initiateGatewayPayment() যেটা Gateway তে redirect করে, verifyGatewayPayment() যেটা পেমেন্ট verification করে এবং Duplicate TrxID চেক করে, goStep() যেটা ফর্ম স্টেপ পরিবর্তন করে, sendOrderNotification() যেটা Telegram এ নোটিফিকেশন পাঠায়, sendDraftNotification() যেটা ট্যাব বন্ধ করলে Draft অর্ডার নোটিফিকেশন পাঠায়।

### অর্ডার সফল পেজ (success.html)

অর্ডার সফল হলে এই পেজে আসে। এখানে একটি অ্যানিমেশন সহ সফল মেসেজ দেখায়, Order ID দেখায় (যেটা কপি করা যায়), অর্ডারের সব Details দেখায় (গ্রাহক তথ্য, ঠিকানা, অর্ডারের আইটেম, দাম), "Download Invoice" বাটন আছে যেটা PDF তে ডাউনলোড করা যায়, "Track Order" লিংক আছে।

প্রধান ফাংশনগুলো হলো: renderOrder() যেটা অর্ডার ডাটা দেখায়, downloadPDF() যেটা html2pdf লাইব্রেরি দিয়ে PDF জেনারেট করে।

### অর্ডার ট্র্যাকিং পেজ (track.html)

এখানে Order ID এবং Phone নম্বর দিয়ে অর্ডার খুঁজতে হয়। সার্চ করলে Timeline দেখায় যেখানে স্ট্যাটাস গুলো দেখায়: Pending (অর্ডার পাওয়া গেছে), Confirmed (অ্যাডমিন কনফার্ম করেছে), Processing (প্রস্তুত করা হচ্ছে), Shipped (কুরিয়ারে দেওয়া হয়েছে), Delivered (গ্রাহকের কাছে পৌঁছে গেছে)। বর্তমান স্ট্যাটাস একটিভ থাকে এবং আগের গুলো Done থাকে।

প্রধান ফাংশনগুলো হলো: trackOrder() যেটা অর্ডার সার্চ করে, renderTimeline() যেটা স্ট্যাটাস টাইমলাইন রেন্ডার করে।

### অফলাইন পেজ (offline.html)

যখন ইন্টারনেট কানেকশন নেই, তখন এই পেজে auto redirect হয়। এখানে "No Internet Connection" মেসেজ দেখায় এবং "Go Online" বাটন আছে যেটা ক্লিক করলে অটো রিফ্রেশ হয়। এটা Service Worker এর কারণে কাজ করে।

---

## 🗄️ ব্যাকএন্ড পার্ট (Supabase)

### config.js - কনফিগারেশন ফাইল

এই ফাইলে সব মূল কনফিগারেশন আছে। এখানে SUPABASE_URL এবং SUPABASE_ANON_KEY আছে যা দিয়ে Supabase এর সাথে কানেকশন হয়। GATEWAY_PROXY_URL এবং GATEWAY_API_KEY আছে যা দিয়ে Payment Gateway এর সাথে কাজ করে। CART_KEY আছে যা দিয়ে localStorage এ কার্ট সেভ করা হয় ('fbr_cart')।

### supabase-init.js

এই ফাইলে Supabase Client তৈরি করা হয় যা সব পেজে ইনক্লুড করা হয়। এটা `sb` নামে global variable তৈরি করে এবং এটা দিয়ে সব Supabase query চালানো হয়।

### সব টেবিল (Database Tables)

**settings টেবিল:**
এখানে স্টোরের সব সেটিংস আছে। যেমন: store_name (স্টোরের নাম), logo_url (লোগো ছবি), bkash_number (bKash নম্বর), nagad_number (Nagad নম্বর), allow_cod (COD চালু আছে কিনা), advance_amount (অগ্রিম কত টাকা নিতে হবে -1 দিলে ডেলিভারি চার্জ, সংখ্যা দিলে সেই টাকা), delivery_zones (ডেলিভারি জোন এবং চার্জ), telegram_main_bot (টেলিগ্রাম Bot Token), telegram_main_chats (যে চ্যাটে নোটিফিকেশন যাবে সেই Chat IDs কমা দিয়ে), telegram_draft_bot এবং draft_chat (অ্যাবেন্ডনেড কার্ট নোটিফিকেশনের জন্য), gateway_proxy_url (Payment Gateway Proxy URL), gateway_api_key (API Key)।

**products টেবিল:**
এখানে সব প্রোডাক্ট আছে। ফিল্ড: id, name, description, price, old_price (যদি ডিসকাউন্ট থাকে), category (ক্যাটাগরি আইডি), images (ছবির অ্যারে), colors (JSON অবজেক্ট কালার এবং স্টক সহ), sizes (JSON অবজেক্ট সাইজ এবং স্টক সহ), is_flash (ফ্ল্যাশ ডিল কিনা), flash_end (ফ্ল্যাশ ডিল কতক্ষণ), stock (মোট স্টক), status (active/inactive)

**categories টেবিল:**
ক্যাটাগরির নাম এবং আইকন। ফিল্ড: id, name, icon, order_num, is_active

**banners টেবিল:**
Hero Slider এর ব্যানার ছবি। ফিল্ড: id, image_url, link (ক্লিক করলে কোন পেজে যাবে), order_num, is_active

**orders টেবিল:**
এখানে সব অর্ডার সেভ থাকে। ফিল্ড: id (unique Order ID), customer_name, customer_phone, customer_email, division, district, upazila, address, items (JSON অ্যারে - প্রোডাক্ট আইডি, নাম, ছবি, দাম, কালার, সাইজ, পরিমাণ), addons (সিলেক্ট করা অ্যাডঅনস), subtotal, addon_total, delivery_charge, promo_code, promo_discount, grand_total, advance_payable, payment_method (bKash/Nagad/COD/Online), payment_status (Unpaid/Advance Paid/Paid), payment_trx_id, status (Pending/Confirmed/Processing/Shipped/Delivered/Cancelled), created_at

**addons টেবিল:**
অপশনাল সার্ভিস। ফিল্ড: id, name, price, icon, is_active

**promos টেবিল:**
প্রোমো কোড। ফিল্ড: id, code, discount (টাকা), min_order (ন্যূনতম অর্ডার), expires_at, is_active

**reviews টেবিল:**
প্রোডাক্ট রিভিউ। ফিল্ড: id, product_id, customer_name, rating (১-৫), comment, created_at

---

## 💳 পেমেন্ট সিস্টেম (বাংলায় বিস্তারিত)

এই প্রজেক্টে ৪টি পেমেন্ট মেথড আছে:

**১. bKash Manual:**
কাস্টমার কে বলা হয় "আপনার bKash এ 01XXXXXXXXX নম্বরে ৳XXX পাঠান"। কাস্টমার পাঠানোর পর Sender Number এবং Transaction ID দেয়। অর্ডার এ সেভ হয় payment_status: "Advance Paid", payment_trx_id: "যা দিয়েছে"।

**২. Nagad Manual:**
একই পদ্ধতি, শুধু Nagad Number দেওয়া হয়।

**৩. COD (Cash on Delivery):**
কাস্টমার পণ্য পেলে টাকা দেয়। অর্ডার এ সেভ হয় payment_method: "COD", payment_status: "Unpaid"। অ্যাডমিন ডেলিভারির সময় টাকা কালেক্ট করে।

**৪. Online Gateway (সবচেয়ে জটিল):**
placeOrder() এ auto_gateway সিলেক্ট করলে initiateGatewayPayment() কাজ করে:
- প্রথমে অর্ডার সেভ হয় Supabase এ status: "Pending", payment_status: "Unpaid"
- Gateway Proxy তে request পাঠায় (amount, customer_name, success_url, cancel_url সহ)
- Proxy response তে payment_url পায়
- সেই URL এ redirect হয়

Gateway পেজে কাস্টমার পেমেন্ট করে। সফল হলে ?status=completed&order_id=XXX&transaction_id=XXX নিয়ে ফেরে আসে। cancel হলে ?status=cancel নিয়ে ফেরে আসে।

ফিরে আসলে verifyGatewayPayment() কাজ করে (উপরে বিস্তারিত)।

---

## 📱 অ্যাডমিন প্যানেল (Admin Panel)

অ্যাডমিন প্যানেল /admin ফোল্ডারে আছে এবং এটা আলাদা ডিজাইন করা।

**admin/index.html:**
লগইন পেজ। Email/Password দিয়ে লগইন করতে হয়। Supabase Auth ব্যবহার করে।

**admin/dashboard.html:**
ড্যাশবোর্ড যেখানে আজকের অর্ডার সংখ্যা, আজকের টাকা, মোট প্রোডাক্ট, মোট গ্রাহক দেখায়।

**admin/orders.html:**
সব অর্ডার লিস্ট। এখানে সার্চ করা যায় (Order ID, নাম, ফোন দিয়ে), ফিল্টার করা যায় (status অনুযায়ী), সর্ট করা যায় (নতুন/পুরোনো/দাম)। অর্ডারে ক্লিক করলে বিস্তারিত দেখায় এবং Status আপডেট করা যায় (Pending → Confirmed → Processing → Shipped → Delivered)।

**admin/products.html:**
প্রোডাক্ট যোগ/এডিট/ডিলিট। ছবি আপলোড করা যায় (Supabase Storage ব্যবহার করে)।

**admin/categories.html:**
ক্যাটাগরি এডিট।

**admin/banners.html:**
ব্যানার এডিট।

**admin/addons.html:**
অ্যাডঅন এডিট (Gift Wrap, Express Delivery etc)।

**admin/delivery.html:**
ডেলিভারি জোন এডিট (Inside Dhaka ৳60, Outside Dhaka ৳120 etc)।

**admin/promos.html:**
প্রোমো কোড (code: SAVE100, discount: 100 টাকা etc)।

**admin/reviews.html:**
রিভিউ দেখা এবং ডিলিট।

**admin/settings.html:**
সব সেটিংস এডিট (Store Name, bKash/Nagad Number, Telegram Tokens, Gateway URLs)।

---

## 🔄 পার্ট ফ্লো (User Journey - স্টোরি আকারে)

ধরো একটা গ্রাহক আসলো:

১. গ্রাহক index.html তে এসে প্রোডাক্ট দেখলো
২. কোনো প্রোডাক্ট এ ক্লিক করলো (product.html গেলো)
৩. রঙ আর সাইজ সিলেক্ট করলো, পরিমাণ বাড়ালো
৪. "Add to Cart" বাটন চাপলো → Toast দেখলো "Added to cart!"
৫. মোবাইলের উপরে cart badge এ সংখ্যা ১ হলো
৬. কার্ট পেজে গেলো (cart.html) → কার্টে প্রোডাক্ট আছে
৭. "Proceed to Checkout" চাপলো
৮. checkout.html তে নাম, ফোন দিলো
৯. Division, District, Upazila, Address দিলো → delivery charge দেখলো
১০. কোনো Addon নিলো না
১১. Payment Method সিলেক্ট করলো (ধরো bKash Manual)
১২. Sender Number আর TrxID দিলো
১৩. "Place Order" চাপলো
১৪. অর্ডার সেভ হলো → localStorage ক্লিয়ার হলো
১৫. success.html গেলো → Order ID দেখলো
১৬. অ্যাডমিন টেলিগ্রামে নোটিফিকেশন পেলো
১৭. অ্যাডমিন dashboard.html তে অর্ডার দেখলো, Status "Confirmed" করলো
১৮. প্রস্তুত হলো, কুরিয়ারে দিলো, Status "Shipped" করলো
১৯. গ্রাহক track.html তে Order ID আর ফোন দিয়ে ট্র্যাক করলো
২০. দেখলো Status "Shipped" - Delivered এর অপেক্ষায়
২১. পেয়ে গেলো → track.html এ "Delivered" দেখলো ✓

---

## ✨ শেষ কথা

এই প্রজেক্টটি সম্পূর্ণ Production-Ready। এখানে সব প্রয়োজনীয় ফিচার আছে: দ্রুত লোডিং, PWA সাপোর্ট, বাংলাদেশ লোকেশন API, একাধিক পেমেন্ট মেথড, পেমেন্ট ভেরিফিকেশন (এখন Duplicate TrxID চেক সহ!), Telegram নোটিফিকেশন, সম্পূর্ণ Admin Panel, Invoice Generation।

**Payment Verification এ সবচেয়ে বড় পরিবর্তন:**
আগে: কেউ একই TrxID দিয়ে দুইবার order place করলে দুটোই Paid হতো।
এখন: verifyGatewayPayment() এ Duplicate TrxID চেক আছে বলে দ্বিতীয়টো BLOCK হয়ে যাবে!

এটাই আমার এই প্রজেক্টে করা সবচেয়ে গুরুত্বপূর্ণ পরিবর্তন।

---

*Generated: April 2026*
*Project: Freelancing By Rifat E-Commerce*
*Backend: Supabase*
*Editor: OpenCode AI*