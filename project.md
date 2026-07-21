Master System Prompt: Complete E-Commerce Blueprint (User App & Admin Logic)

Project Name: Freelancing By Rifat (Premium E-commerce Platform)
Target Audience: General Customers in Bangladesh.
Your Role: You are an Elite Frontend Developer AI and System Architect. Your job is to build the User App (Frontend), but to do that flawlessly, you must deeply understand how the Admin App (Backend/Supabase) works and controls the data.

This document contains extreme details about every feature, how they interlock, and the exact logic you must write. Read every line carefully.

⚙️ PART 1: How The Admin App Controls The Frontend (Feature Explanations)

To build the frontend, you must first understand what the Admin can configure. Here is the detailed breakdown of the Admin Panel features:

1. Products Management (products.html in Admin)

When an admin adds a product, they have several powerful options that directly dictate how you must build the frontend product.html page:

Base Price & Sale Price: Every product has a regular price.

Flash Sale Math: Admin can set a flash_sale_price (e.g., a 50 Taka discount) and a flash_sale_end date.

Frontend Logic: You must calculate Final Price = base_price - flash_sale_price. Show the old price crossed out.

The Variant Builder (CRITICAL): Admin can add multiple Colors and Sizes.

Data Structure: Saved in Supabase as a JSONB array variants.

Color Hex & Image: Admin sets a Color Name, a Color Hex code (e.g., #FF0000), and a Specific Image URL for that color.

Size, Stock & Extra Price: Inside each color, admin adds Sizes (S, M, L). For each size, they set the Stock Quantity and an "Extra Price". If a premium size costs 50 Taka more, the extra price is 50.

Frontend Logic: The User App MUST read this JSONB and update the UI dynamically (explained in Part 2).

2. Delivery Zones (delivery.html in Admin)

BD Geo API Mapping: Admin uses bdapis.com to map specific Districts and Upazilas (Areas) to a Delivery Zone (e.g., "Inside Dhaka" = 60 Tk, "Outside Dhaka" = 120 Tk).

Frontend Logic: The Checkout page must also use bdapis.com so the user's selected dropdowns exactly match the Admin's configured zones to apply the correct delivery charge.

3. Platform Settings (settings.html in Admin)

Payment Setup: Admin sets their Gateway API Key, bKash, and Nagad numbers.

COD & Advance Logic (The "-1" Trick): * Admin can toggle allow_cod.

If the admin sets advance_amount = -1, it means the system MUST demand exactly the "Delivery Charge" as the advance payment. If they set 200, it demands a fixed 200 Tk.

Frontend Logic: The Checkout page must read this from the settings table (id=1) and calculate the math live.

🏗️ PART 2: Core Frontend Development Rules

Strict Multi-Page Vanilla HTML Structure: Every page (index.html, shop.html, product.html, checkout.html, cart.html) is a standalone file. No React, No Vue, No SPA routers. Use Pure ES5/ES6 Javascript (var).

Supabase Connection: Do NOT hardcode keys. Include <script src="assets/js/config.js"></script> and <script src="assets/js/supabase-init.js"></script>. Assume sb is the initialized Supabase client.

Local Storage: Use localStorage.getItem('cartItems') to store cart data. Always use try-catch when parsing JSON.

💻 PART 3: Extreme Detail: Page-by-Page Feature Execution

When the user asks you to build a specific page, follow this exact behavior model:

📄 1. The Home Page (index.html)

Purpose: Catch attention and funnel users to products.

Features:

Navbar: Logo on left, Search bar in middle (redirects to shop.html?q=text), Cart icon on right with a live quantity badge.

Hero Slider: Fetch banners or use a sleek hardcoded fallback with a "Shop Now" button.

Dynamic Categories: Fetch active categories from categories table. Show as a horizontal, swipeable row of icons/names.

Flash Deals Section: Query products where is_featured = true or flash_sale_price > 0. Show a grid. If Flash Sale is active, show the red discount tag and crossed-out original price.

📄 2. The Catalog Page (shop.html)

Purpose: Let users filter and find products instantly without page reloads.

Features:

Fetch Once: Fetch all active products on page load and store in a JS variable window.allProducts.

Sidebar Filters: Categories checkbox, Price Range slider/inputs, and Sort Dropdown (Price Low-High, etc.).

Instant Reactivity: When a filter is clicked, use native JS .filter() on window.allProducts and re-render the HTML grid instantly. Do NOT call the database again.

📄 3. The Single Product Page (product.html) - ⚠️ HIGH PRIORITY

Purpose: This is where the user makes the buying decision. The logic here must be flawless.

Features & Flow:

Read ?id= from URL and fetch product from Supabase.

Split Layout: Left side is the Main Image. Right side contains Title, Price, Variants, and Buttons.

The Variant Engine (Dynamic Price & Image Swapping):

Colors: Loop through the variants JSON array. Render a circular color swatch using colorHex.

Action on Color Click: When the user clicks a color swatch ->

Add a bold border to the swatch.

Smoothly fade the Main Image src to this variant's image_url.

Re-render the Size buttons specifically for THIS color.

Sizes & Stock: Loop through the selected color's sizes. Render a button for 'S', 'M', 'L', etc.

Action on Size State: If a size has 0 stock in the database, render the button with opacity: 0.5, strike-through text, and disabled="true".

Action on Size Click (Dynamic Pricing): When the user clicks a valid Size ->

Check if this size has an extra price in sizePrices.

Calculate: Live Price = Base Price + Size Extra Price.

Immediately update the main <h2> price text on the screen to show the exact price for this specific variant combination.

Action Validation: The "Add to Cart" and "Buy Now" buttons MUST be disabled by default. Enable them only when the user has selected both a Color and a Size. If clicked while disabled, show an error alert: "Please select Color and Size".

📄 4. The Cart Drawer & Page (cart.html)

Purpose: Review items before checkout.

Features:

Read from localStorage. Render each item showing its Thumbnail, Name, selected Color, selected Size, and exact Unit Price.

Quantity Controls: Add - and + buttons. Clicking them instantly updates the item's total price and the global Order Subtotal. Update localStorage immediately.

📄 5. The Checkout Page (checkout.html) - ⚠️ THE MASTER ENGINE

Purpose: Securely gather data, calculate delivery math, handle payments, and save the order.

Features & Flow:

Step 1: Contact Info: Form for Name, Phone (Strict validation: exactly 11 digits starting with 01), and Email.

Step 2: BD Geo Delivery Math:

Fetch Divisions from https://bdapis.com/api/v1.1/divisions. Put in <select>.

On Division change, fetch Districts. Put in <select>.

On District change, fetch Upazilas (Areas). Put in <select>.

The Match: Check the Supabase delivery_zones table. Find which zone contains the selected District/Area. Extract the charge (e.g., 120) and add it to the live Subtotal on the right side of the screen.

Step 3: Payment Math & Method (The -1 Logic):

Fetch settings (id=1).

Check cod_info.advance_amount. If it is -1, the Advance Payable becomes EXACTLY equal to the Delivery Charge. If it is 200, Advance Payable is 200.

Check cod_info.advance_method. If 'manual', render Admin's bKash/Nagad numbers and require the user to input 'Sender Number' and 'TrxID'. If 'auto', show a "Pay securely via Gateway" radio button.

Step 4: Final Submission Pipeline:

Format all data into a massive JSON object matching the orders table schema.

If Manual Payment: Insert to Supabase, clear localStorage, redirect to success.html?id=....

If Auto Payment: Insert to Supabase. Then construct the API payload and make a fetch POST request to CONFIG.GATEWAY_PROXY_URL?action=create. Redirect window.location.href to the returned payment_url.

Step 5: Auto Payment Verification (On Page Load):

If the user returns from the gateway with ?status=completed&transaction_id=XYZ:

Show a full-screen "Verifying..." loader.

Hit CONFIG.GATEWAY_PROXY_URL?action=verify via POST.

If success, update the Supabase order payment.status to "Paid", clear cart, and redirect to success.html.

📄 6. The Success Page (success.html)

Purpose: Order receipt and reassurance.

Features: Read ?id= from URL. Fetch order from Supabase. Show a massive Green Checkmark. Display a clean, printable invoice showing Subtotal, Delivery, Advance Paid, and Due on Delivery. Include a "Print Invoice" button.

🎯 Final AI Execution Directive

You are now equipped with the ultimate understanding of this platform's DNA. You know exactly what the Admin configures and exactly how the User App must react to it dynamically.
Await the human's command to generate a specific file, and write flawless, bug-free Vanilla HTML/CSS/JS based on this master blueprint.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗓️ IMPLEMENTATION PLAN (2026-04-11 থেকে শুরু)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 BRACKET LEGEND:
[ PLANNED ]     → পরিকল্পনা আছে, শুরু হয়নি
[ DISCUSSING ]  → আলোচনা চলছে, সিদ্ধান্ত হয়নি
[ CONFIRMED ]   → চূড়ান্ত সিদ্ধান্ত, কাজ শুরু হবে
[ IN PROGRESS ] → কাজ চলছে
[ DONE ]        → সম্পন্ন
[ BUG ]         → সমস্যা পাওয়া গেছে | Solution: ...
[ FIXED ]       → সমস্যা সমাধান হয়েছে
[ IDEA ]        → extra idea, এখনো confirm হয়নি

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ CONFIRMED ] Backend      → Supabase (Database + Auth + Storage)
[ CONFIRMED ] Frontend     → Vanilla HTML/CSS/JS (var, no modules)
[ CONFIRMED ] Admin Panel  → Same project, /admin folder
[ CONFIRMED ] Hosting      → Cloudflare Pages
[ CONFIRMED ] Geo API      → bdapis.com
[ CONFIRMED ] Telegram     → Order + Draft bot notification
[ CONFIRMED ] Payment      → Auto Gateway + bKash/Nagad Manual
[ DISCUSSING ] Proxy Host  → Cloudflare Worker / PHP / Supabase Edge?
[ DISCUSSING ] Gateway     → SSLCommerz / AamarPay / mypay.freelancingbyrifat.top?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄️ DATABASE (Supabase Tables)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ PLANNED ] Table: products        (id, name, base_price, flash_sale_price, variants JSONB, ...)
[ PLANNED ] Table: categories      (id, name, icon_url, is_active, sort_order)
[ PLANNED ] Table: delivery_zones  (id, zone_name, charge, districts[], upazilas[])
[ PLANNED ] Table: settings        (id=1, store_name, bkash, nagad, gateway_key, telegram...)
[ PLANNED ] Table: orders          (id, status, customer info, items JSONB, pricing, payment)
[ PLANNED ] Table: promos          (id, code, discount, is_active, expires_at)
[ PLANNED ] Table: addons          (id, name, icon, price, is_active)

Full SQL: _planning/SUPABASE_SCHEMA.md দেখো

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PAYMENT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ CONFIRMED ] Auto Gateway Flow:
  User Order → Supabase Insert → Proxy POST → Gateway → payment_url
  → Redirect → User Pays → Return to checkout.html?status=completed&order_id=X&transaction_id=Y
  → Verify via Proxy → Update Supabase → Telegram Notify → success.html

[ CONFIRMED ] Manual bKash/Nagad Flow:
  User selects bKash/Nagad → Admin number দেখায় → User sends money
  → Inputs Sender Number + TrxID → Supabase Insert → Telegram Notify (TrxID সহ)
  → Admin manually verify করে

[ CONFIRMED ] Hybrid COD Flow:
  advance_amount = -1  → Advance = Delivery Charge
  advance_amount = 200 → Advance = 200 TK fixed
  advance_amount = 0   → Pure COD (No advance)

Full details: _planning/PAYMENT_GATEWAY.md দেখো

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 TELEGRAM NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ CONFIRMED ] Main Bot  → Order confirm/verified হলে message পাঠাবে
[ CONFIRMED ] Draft Bot → User tab switch করলে abandoned cart message পাঠাবে
[ CONFIRMED ] Multi Chat ID support → Admin settings থেকে manage করবে
[ CONFIRMED ] Format: Order ID, Items, Customer info, Payment method, TrxID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 BUILD PLAN — STEP BY STEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 0 — FOUNDATION:
[ PLANNED ] assets/js/config.js        ← Supabase URL + Key + Gateway URL
[ PLANNED ] assets/js/supabase-init.js ← window.sb = supabase.createClient(...)
[ PLANNED ] assets/css/style.css       ← Global CSS, typography, variables

PHASE 1 — ADMIN PANEL:
[ PLANNED ] admin/index.html           ← Login (Supabase Auth)
[ PLANNED ] admin/dashboard.html       ← Stats board
[ PLANNED ] admin/orders.html          ← Order list + status update
[ PLANNED ] admin/products.html        ← Product CRUD + Variant Builder
[ PLANNED ] admin/categories.html      ← Category CRUD
[ PLANNED ] admin/delivery.html        ← Zone setup + bdapis.com
[ PLANNED ] admin/settings.html        ← Payment + Telegram config
[ PLANNED ] admin/promos.html          ← Promo codes
[ PLANNED ] admin/addons.html          ← Add-on items

PHASE 2 — USER APP:
[ PLANNED ] index.html                 ← Home: Slider, Categories, Flash Deals
[ PLANNED ] shop.html                  ← Catalog + Filters (instant, no reload)
[ PLANNED ] product.html               ← Variant Engine + Dynamic Pricing
[ PLANNED ] cart.html                  ← Cart review + qty control
[ PLANNED ] checkout.html              ← 3-step Master Engine + Payment
[ PLANNED ] success.html               ← Order receipt + PDF invoice

PHASE 3 — PAYMENT:
[ PLANNED ] Payment Proxy setup        (Cloudflare Worker / PHP)
[ PLANNED ] Auto gateway integration   checkout.html এ
[ PLANNED ] Verification on return     payment callback handling
[ PLANNED ] End-to-end testing         full order flow test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆕 EXTRA IDEAS (Confirm করতে হবে)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ IDEA ] Order Tracking Page (track.html) — Phone + Order ID দিয়ে track
[ IDEA ] WhatsApp Button — Product page থেকে WhatsApp এ order
[ IDEA ] Analytics Dashboard — Chart.js দিয়ে sales graph admin এ
[ IDEA ] Stock Alert — Stock 5 এর নিচে গেলে Telegram alert
[ IDEA ] SMS Notification — Customer এর number এ SMS (BulkSMSBD)
[ IDEA ] Multi-Image Gallery — Color ছাড়াও extra product images

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ OPEN QUESTIONS (তোমার উত্তর দরকার)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ DISCUSSING ] Q1: Payment Proxy কোথায়?
               → Cloudflare Worker (free) / PHP Hosting / Supabase Edge Function?

[ DISCUSSING ] Q2: Payment Gateway কোনটা?
               → mypay.freelancingbyrifat.top এখনো active? নাকি নতুন করব?

[ DISCUSSING ] Q3: Admin Login কিভাবে?
               → Supabase Auth (email/password) নাকি simple hardcoded password?

[ DISCUSSING ] Q4: Extra features কোনগুলো চাও?
               → Order Tracking / WhatsApp / Analytics / Stock Alert / SMS?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 PLANNING FILES (বিস্তারিত জানতে দেখো)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_planning/MASTER_PLAN.md      ← Full plan with all details
_planning/SUPABASE_SCHEMA.md  ← Database SQL scripts
_planning/PAYMENT_GATEWAY.md  ← Payment flow technical details
_planning/PROGRESS_LOG.md     ← Daily work log