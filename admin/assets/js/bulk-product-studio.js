// ============================================================
// Bulk Product Copy & Edit Studio + Smart Auto-SKU Engine
// Format: [2 Letters from Product Name]-[3 to 4 Digit Number]
// ============================================================

(function() {
    'use strict';

    var bulkStagedItems = [];
    var domainCatalogCache = {};
    var isBulkSaving = false;

    // Common English filler words to ignore when picking 2-letter SKU prefix
    var STOP_WORDS = new Set([
        'the', 'and', 'for', 'with', 'from', 'in', 'on', 'at', 'to', 'of', 'by',
        'bd', 'bangladesh', 'price', 'online', 'shop', 'store', 'new', 'best', 'buy', 'original'
    ]);

    // Common Bangla keyword to 2-letter SKU prefix mapping
    var BANGLA_PREFIX_MAP = [
        { kw: ['পাঞ্জাবি', 'পাঞ্জাবী'], prefix: 'PJ' },
        { kw: ['ঘড়ি', 'ঘড়ি', 'ওয়াচ', 'ওয়াচ'], prefix: 'WC' },
        { kw: ['টি-শার্ট', 'টিশার্ট', 'গেঞ্জি'], prefix: 'TS' },
        { kw: ['শার্ট'], prefix: 'SH' },
        { kw: ['প্যান্ট', 'জিন্স', 'ট্রাউজার'], prefix: 'PT' },
        { kw: ['জুতা', 'স্নিকার', 'লোফার', 'স্যান্ডেল'], prefix: 'SH' },
        { kw: ['ব্যাগ', 'মানিব্যাগ', 'ওয়ালেট', 'ওয়ালেট'], prefix: 'BG' },
        { kw: ['চশমা', 'সানগ্লাস'], prefix: 'GL' },
        { kw: ['ইয়ারবাড', 'ইয়ারবাড', 'হেডফোন', 'এয়ারপড'], prefix: 'EB' },
        { kw: ['শাড়ি', 'শাড়ি'], prefix: 'SR' },
        { kw: ['থ্রি-পিস', 'থ্রি পিস', 'কুর্তি', 'কামিজ'], prefix: 'KP' },
        { kw: ['বোরকা', 'হিজাব', 'আবায়া'], prefix: 'BK' },
        { kw: ['পারফিউম', 'আতর', 'বডি স্প্রে'], prefix: 'PF' },
        { kw: ['কনসোল', 'গেম', 'গেমিং', 'খেলনা'], prefix: 'GM' },
        { kw: ['হুডি', 'জ্যাকেট', 'সোয়েটার'], prefix: 'HD' }
    ];

    var BANGLA_CHAR_MAP = {
        'ক':'K','খ':'K','গ':'G','ঘ':'G','চ':'C','ছ':'C','জ':'J','ঝ':'J',
        'ট':'T','ঠ':'T','ড':'D','ঢ':'D','ত':'T','থ':'T','দ':'D','ধ':'D',
        'ন':'N','ণ':'N','প':'P','ফ':'F','ব':'B','ভ':'V','ম':'M','য':'J',
        'র':'R','ল':'L','শ':'S','ষ':'S','স':'S','হ':'H','অ':'A','আ':'A',
        'ই':'I','ঈ':'I','উ':'U','ঊ':'U','এ':'E','ও':'O'
    };

    /**
     * Extract 2 uppercase letters from product name
     */
    function extractSkuPrefix(name) {
        var raw = (name || '').trim();
        if (!raw) return 'PR';

        // 1. Try Latin words first
        var latinWords = (raw.match(/[A-Za-z]+/g) || []).filter(function(w) {
            return w.length >= 1;
        });

        var meaningful = latinWords.filter(function(w) {
            return w.length >= 2 && !STOP_WORDS.has(w.toLowerCase());
        });
        var pool = meaningful.length > 0 ? meaningful : latinWords;

        if (pool.length >= 2) {
            return (pool[0].charAt(0) + pool[1].charAt(0)).toUpperCase();
        }
        if (pool.length === 1 && pool[0].length >= 2) {
            return pool[0].substring(0, 2).toUpperCase();
        }

        // 2. Check Bangla keyword dictionary
        for (var i = 0; i < BANGLA_PREFIX_MAP.length; i++) {
            var entry = BANGLA_PREFIX_MAP[i];
            for (var j = 0; j < entry.kw.length; j++) {
                if (raw.indexOf(entry.kw[j]) !== -1) {
                    return entry.prefix;
                }
            }
        }

        // 3. Phonetic transliteration from Bangla letters
        var letters = '';
        for (var c = 0; c < raw.length && letters.length < 2; c++) {
            var ch = raw.charAt(c);
            if (/[A-Za-z]/.test(ch)) {
                letters += ch.toUpperCase();
            } else if (BANGLA_CHAR_MAP[ch]) {
                letters += BANGLA_CHAR_MAP[ch];
            }
        }
        if (letters.length === 2) return letters;
        if (letters.length === 1) return letters + 'X';
        return 'PR';
    }

    /**
     * Generate a unique SKU in format XX-1234 (2 letters from product name + '-' + 3 to 4 digits)
     */
    window.generateAutoSku = function(productName, extraUsedSkus) {
        var prefix = extractSkuPrefix(productName);
        var used = new Set();

        if (typeof allProducts !== 'undefined' && Array.isArray(allProducts)) {
            allProducts.forEach(function(p) {
                if (p && p.sku) used.add(String(p.sku).trim().toUpperCase());
                if (p && p.id)  used.add(String(p.id).trim().toUpperCase());
            });
        }

        bulkStagedItems.forEach(function(item) {
            if (item && item.sku) used.add(String(item.sku).trim().toUpperCase());
        });

        if (extraUsedSkus) {
            if (Array.isArray(extraUsedSkus)) {
                extraUsedSkus.forEach(function(s) { if (s) used.add(String(s).trim().toUpperCase()); });
            } else if (extraUsedSkus instanceof Set) {
                extraUsedSkus.forEach(function(s) { if (s) used.add(String(s).trim().toUpperCase()); });
            }
        }

        // Generate 3 to 4 digit number (e.g. 101 to 9999)
        for (var attempt = 0; attempt < 200; attempt++) {
            var useFourDigits = (attempt % 3 !== 0); // Mix 4-digit (e.g. 1042) and 3-digit (e.g. 245)
            var num = useFourDigits
                ? Math.floor(1000 + Math.random() * 9000)
                : Math.floor(101 + Math.random() * 899);
            var candidate = prefix + '-' + num;
            if (!used.has(candidate)) {
                return candidate;
            }
        }
        return prefix + '-' + Math.floor(1000 + Math.random() * 9000);
    };

    /**
     * Fill or regenerate SKU in the Single Product Modal
     */
    window.fillSingleProductAutoSku = function(force) {
        var nameInput = document.getElementById('pName');
        var skuInput  = document.getElementById('pSku');
        if (!skuInput) return;
        var currentSku = skuInput.value.trim();
        if (!force && currentSku && skuInput.dataset.autoGenerated !== 'true') {
            return;
        }
        var prodName = nameInput ? nameInput.value.trim() : '';
        var newSku = window.generateAutoSku(prodName);
        skuInput.value = newSku;
        skuInput.dataset.autoGenerated = 'true';
    };

    // ── Single URL / Product Data Fetcher (Reusable for Bulk) ────────────────
    async function fetchWithTimeout(url, timeoutMs) {
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 8000);
        try {
            var res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            return res;
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    }

    async function tryFetchJson(url) {
        try {
            var res = await fetchWithTimeout(url, 7500);
            if (res.ok) return await res.json();
        } catch (e) {}
        return null;
    }

    async function getDomainCatalog(origin) {
        if (domainCatalogCache[origin]) return domainCatalogCache[origin];
        var listUrls = [
            origin + '/api/public-data?all=1',
            origin + '/api/public-data'
        ];
        for (var i = 0; i < listUrls.length; i++) {
            var u = listUrls[i];
            var listRes = await tryFetchJson(u);
            if (!listRes) {
                listRes = await tryFetchJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(u));
            }
            if (!listRes) {
                listRes = await tryFetchJson('https://corsproxy.io/?' + encodeURIComponent(u));
            }
            if (listRes) {
                var prods = (listRes.data && listRes.data.products) ? listRes.data.products : (listRes.products || []);
                var cats  = (listRes.data && listRes.data.categories) ? listRes.data.categories : (listRes.categories || []);
                var pc    = (listRes.data && listRes.data.product_categories) ? listRes.data.product_categories : (listRes.product_categories || []);
                if (Array.isArray(prods) && prods.length > 0) {
                    domainCatalogCache[origin] = { products: prods, categories: cats, product_categories: pc };
                    return domainCatalogCache[origin];
                }
            }
        }
        return null;
    }

    async function fetchSingleProductByUrl(rawUrl) {
        var cleanUrl = (rawUrl || '').trim();
        if (!cleanUrl) return null;
        if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

        var parsedUrl;
        try {
            parsedUrl = new URL(cleanUrl);
        } catch (e) {
            return null;
        }

        var origin = parsedUrl.origin;
        var productId = parsedUrl.searchParams.get('id') ||
                        parsedUrl.searchParams.get('product_id') ||
                        parsedUrl.searchParams.get('pid') ||
                        parsedUrl.searchParams.get('p');

        if (!productId) {
            var pathMatch = parsedUrl.pathname.match(/\/product(?:s)?\/([a-zA-Z0-9_\-]+)/i) ||
                            parsedUrl.pathname.match(/\/p\/([a-zA-Z0-9_\-]+)/i);
            if (pathMatch && pathMatch[1]) {
                productId = pathMatch[1].replace(/\.html$/i, '');
            }
        }

        var productData = null;

        // 1. Check cached domain catalog first (super fast when importing many links from same store!)
        var catalog = await getDomainCatalog(origin);
        if (catalog && Array.isArray(catalog.products)) {
            if (productId) {
                productData = catalog.products.find(function(p) {
                    return String(p.id) === String(productId) || p.slug === productId;
                });
            }
            if (!productData) {
                var slugCand = parsedUrl.searchParams.get('slug') || parsedUrl.pathname.split('/').pop().replace(/\.html$/i, '');
                if (slugCand && slugCand !== 'product' && slugCand !== 'shop' && slugCand !== 'index') {
                    productData = catalog.products.find(function(p) {
                        return (p.slug && p.slug === slugCand) || (String(p.id) === String(slugCand));
                    });
                }
            }
        }

        // 2. Direct single-product API lookup if productId is present
        if (!productData && productId) {
            var apiDirect = origin + '/api/public-data?product_id=' + encodeURIComponent(productId);
            var resJson = await tryFetchJson(apiDirect);
            if (!resJson || !resJson.product) {
                resJson = await tryFetchJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(apiDirect));
            }
            if (!resJson || !resJson.product) {
                resJson = await tryFetchJson('https://corsproxy.io/?' + encodeURIComponent(apiDirect));
            }
            if (resJson && resJson.product) {
                productData = resJson.product;
            }
        }

        // 3. Fallback: Scrape HTML page via DOM & JSON-LD
        if (!productData) {
            var htmlText = null;
            try {
                var r1 = await fetchWithTimeout('https://api.allorigins.win/raw?url=' + encodeURIComponent(cleanUrl), 8500);
                if (r1.ok) htmlText = await r1.text();
            } catch (e) {}
            if (!htmlText) {
                try {
                    var r2 = await fetchWithTimeout('https://corsproxy.io/?' + encodeURIComponent(cleanUrl), 8500);
                    if (r2.ok) htmlText = await r2.text();
                } catch (e) {}
            }

            if (htmlText) {
                var doc = new DOMParser().parseFromString(htmlText, 'text/html');
                var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                for (var s = 0; s < scripts.length; s++) {
                    try {
                        var ld = JSON.parse(scripts[s].textContent || '');
                        var item = ld['@type'] === 'Product' ? ld : (Array.isArray(ld['@graph']) ? ld['@graph'].find(function(x){ return x['@type'] === 'Product'; }) : null);
                        if (item && item.name) {
                            productData = {
                                name: item.name,
                                description: item.description || '',
                                base_price: item.offers ? (parseInt(item.offers.price || item.offers.highPrice || item.offers.lowPrice, 10) || 0) : 0,
                                gallery_images: Array.isArray(item.image) ? item.image : (item.image ? [item.image] : []),
                                sku: item.sku || ''
                            };
                            break;
                        }
                    } catch (le) {}
                }

                if (!productData) {
                    var ogTitle = (doc.querySelector('meta[property="og:title"]') || {}).content || doc.title || '';
                    var ogDesc  = (doc.querySelector('meta[property="og:description"]') || doc.querySelector('meta[name="description"]') || {}).content || '';
                    var ogImage = (doc.querySelector('meta[property="og:image"]') || {}).content || '';
                    var priceEl = doc.querySelector('#currentPrice, .price-tag, .product-price, .current-price, [data-price]');
                    var parsedPrice = priceEl ? (parseInt(priceEl.textContent.replace(/[^0-9]/g, ''), 10) || 0) : 0;
                    var descEl = doc.querySelector('#pDesc, .product-description');

                    var imgs = [];
                    if (ogImage) imgs.push(ogImage);
                    doc.querySelectorAll('.gallery-thumb, .gallery-main img, .product-gallery img').forEach(function(img) {
                        var src = img.getAttribute('src') || img.getAttribute('data-src');
                        if (src && !imgs.includes(src) && !src.includes('avatar') && !src.includes('logo')) {
                            if (!src.startsWith('http')) {
                                try { src = new URL(src, origin).href; } catch(e){}
                            }
                            imgs.push(src);
                        }
                    });

                    var titleClean = ogTitle.split('—')[0].split('|')[0].trim();
                    if (titleClean) {
                        productData = {
                            name: titleClean,
                            description: (descEl && descEl.innerHTML.trim()) ? descEl.innerHTML.trim() : ogDesc,
                            base_price: parsedPrice,
                            gallery_images: imgs
                        };
                    }
                }
            }
        }

        if (!productData || (!productData.name && !productData.title)) return null;
        return normalizeRawProductToStagedItem(productData, cleanUrl);
    }

    function normalizeRawProductToStagedItem(raw, sourceUrl, batchSkusSet) {
        var prodName = (raw.name || raw.title || 'Untitled Product').trim();
        var gImages = raw.gallery_images;
        if (typeof gImages === 'string') {
            try { gImages = JSON.parse(gImages); } catch (e) { gImages = gImages ? [gImages] : []; }
        }
        if (!Array.isArray(gImages)) gImages = raw.image ? [raw.image] : [];
        gImages = gImages.filter(Boolean);

        var vData = raw.variants;
        if (typeof vData === 'string') {
            try { vData = JSON.parse(vData); } catch (e) { vData = []; }
        }
        if (!Array.isArray(vData)) vData = [];

        // Auto-generate SKU in XX-1234 format if missing or generic 'SKU-...'
        var rawSku = (raw.sku || '').trim();
        var needsAutoSku = !rawSku || /^sku[-_]/i.test(rawSku) || /^prod[-_]/i.test(rawSku);
        var finalSku = needsAutoSku ? window.generateAutoSku(prodName, batchSkusSet) : rawSku;
        if (batchSkusSet) batchSkusSet.add(finalSku.toUpperCase());

        return {
            _uid: 'bulk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            selected: true,
            expanded: false,
            sourceUrl: sourceUrl || '',
            name: prodName,
            sku: finalSku,
            skuAuto: needsAutoSku,
            base_price: parseInt(raw.base_price, 10) || 0,
            flash_sale_price: parseInt(raw.flash_sale_price, 10) || 0,
            description: raw.description || '',
            gallery_images: gImages,
            variants: JSON.parse(JSON.stringify(vData)),
            video_url: raw.video_url || '',
            video_type: raw.video_type || 'auto',
            tags: raw.tags || raw.seo_keywords || '',
            seo_title: raw.seo_title || '',
            seo_description: raw.seo_description || '',
            slug: raw.slug || '',
            is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
            is_featured: Boolean(raw.is_featured),
            is_add_once: Boolean(raw.is_add_once),
            category_ids: [] // Strictly isolated array per product!
        };
    }

    // ── Inject Bulk Studio UI & Buttons on DOM Ready ─────────────────────────
    function initBulkStudioUI() {
        // 1. Add "📦 Bulk Import Studio" button to header next to "+ Add Product"
        var headerRight = document.querySelector('.admin-header .header-right');
        if (headerRight && !document.getElementById('openBulkStudioBtn')) {
            var bulkBtn = document.createElement('button');
            bulkBtn.id = 'openBulkStudioBtn';
            bulkBtn.className = 'btn';
            bulkBtn.type = 'button';
            bulkBtn.onclick = function() { window.openBulkImportModal(); };
            bulkBtn.style.cssText = 'background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; font-weight: 700; box-shadow: 0 2px 8px rgba(16,185,129,0.3); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;';
            bulkBtn.innerHTML = '<span>📦 Bulk Copy &amp; Import</span>';
            headerRight.appendChild(bulkBtn);
        }

        // 2. Add "⚡ Auto SKU" button and auto-fill listener to Single Product Modal
        var pSkuInput = document.getElementById('pSku');
        var pNameInput = document.getElementById('pName');
        if (pSkuInput && !document.getElementById('singleAutoSkuBtn')) {
            var labelEl = pSkuInput.previousElementSibling;
            if (labelEl) {
                labelEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
                labelEl.innerHTML = '<span>Product SKU</span>' +
                    '<button type="button" id="singleAutoSkuBtn" onclick="fillSingleProductAutoSku(true)" style="background:rgba(79,70,229,0.12);color:#4f46e5;border:1px solid rgba(79,70,229,0.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;" title="প্রোডাক্টের নাম থেকে অটোমেটিক SKU (XX-1234) তৈরি করুন">⚡ Auto SKU</button>';
            }
            pSkuInput.addEventListener('input', function() {
                pSkuInput.dataset.autoGenerated = 'false';
            });
        }
        if (pNameInput && !pNameInput.dataset.skuBound) {
            pNameInput.dataset.skuBound = 'true';
            pNameInput.addEventListener('input', function() {
                if (typeof editingProductId !== 'undefined' && editingProductId) return;
                var skuInp = document.getElementById('pSku');
                if (skuInp && (!skuInp.value.trim() || skuInp.dataset.autoGenerated === 'true')) {
                    window.fillSingleProductAutoSku(true);
                }
            });
        }

        // 3. Add shortcut inside #quickImportCard to open Bulk Import Studio
        var quickCard = document.getElementById('quickImportCard');
        if (quickCard && !document.getElementById('switchToBulkBtn')) {
            var topRow = quickCard.firstElementChild;
            if (topRow) {
                var switchBtn = document.createElement('button');
                switchBtn.id = 'switchToBulkBtn';
                switchBtn.type = 'button';
                switchBtn.onclick = function() {
                    if (typeof closeModal === 'function') closeModal('productModal');
                    window.openBulkImportModal();
                };
                switchBtn.style.cssText = 'font-size: 11.5px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #059669, #10b981); border: none; padding: 4px 11px; border-radius: 20px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(16,185,129,0.25);';
                switchBtn.innerHTML = '📦 Bulk Import Multiple Products →';
                topRow.appendChild(switchBtn);
            }
        }

        // 4. Inject Bulk Studio Modal HTML & Styles
        if (!document.getElementById('bulkStudioModal')) {
            var styleEl = document.createElement('style');
            styleEl.textContent = `
                .bulk-studio-box { max-width: 1120px !important; width: 96vw !important; padding: 20px 22px !important; }
                .bulk-fetch-panel { background: linear-gradient(135deg, rgba(79,70,229,0.06), rgba(16,185,129,0.06)); border: 1.5px dashed rgba(79,70,229,0.35); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
                .bulk-toolbar { background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
                .bulk-toolbar-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
                .bulk-cat-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; border: 1.5px solid #d1d5db; background: #fff; color: #374151; cursor: pointer; user-select: none; transition: all 0.15s; }
                .bulk-cat-pill:hover { border-color: #6366f1; }
                .bulk-cat-pill.active { background: rgba(79,70,229,0.12); border-color: #4f46e5; color: #4338ca; font-weight: 700; }
                .bulk-item-card { background: #fff; border: 1.5px solid var(--border); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; transition: all 0.15s; }
                .bulk-item-card.unselected { opacity: 0.55; background: #f9fafb; }
                .bulk-item-card:hover { border-color: rgba(79,70,229,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
                .bulk-item-grid { display: grid; grid-template-columns: 28px 64px minmax(180px, 1.6fr) minmax(135px, 0.9fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) auto; gap: 10px; align-items: center; }
                .bulk-item-thumb { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #e5e7eb; background: #f3f4f6; }
                .bulk-item-cats { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; padding-top: 9px; border-top: 1px dashed #e5e7eb; align-items: center; }
                .bulk-drawer { margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; display: none; }
                .bulk-drawer.open { display: block; }
                .bulk-mini-label { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; display: block; }
                .bulk-inp { width: 100%; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; font-family: inherit; color: #1e293b; background: #fff; outline: none; }
                .bulk-inp:focus { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,0.15); }
                @media (max-width: 860px) {
                    .bulk-item-grid { grid-template-columns: 24px 54px 1fr; }
                }
            `;
            document.head.appendChild(styleEl);

            var modalEl = document.createElement('div');
            modalEl.className = 'modal-overlay';
            modalEl.id = 'bulkStudioModal';
            modalEl.innerHTML = `
                <div class="modal-box bulk-studio-box">
                    <div class="modal-header" style="margin-bottom: 12px;">
                        <div>
                            <div class="modal-title" style="display:flex;align-items:center;gap:8px;font-size:18px;">
                                <span>📦 Bulk Product Copy &amp; Edit Studio</span>
                                <span style="font-size:11px;font-weight:700;background:rgba(16,185,129,0.14);color:#059669;padding:3px 10px;border-radius:20px;">Auto SKU (XX-1234) + Per-Product Editor</span>
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
                                একসাথে অনেকগুলো প্রোডাক্ট লিংক বা পুরো শপ থেকে প্রোডাক্ট কপি করে প্রতিটির ক্যাটাগরি, দাম ও অটো-SKU এডিট করে ১ ক্লিকে সেভ করুন।
                            </div>
                        </div>
                        <button class="modal-close" onclick="closeModal('bulkStudioModal')">✖</button>
                    </div>

                    <div style="max-height: 76vh; overflow-y: auto; padding-right: 4px;">
                        <!-- Step 1: URL Input & Store Scanner -->
                        <div class="bulk-fetch-panel">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                                <div style="font-size:13px;font-weight:800;color:#1e293b;">
                                    🔗 Step 1: প্রোডাক্টের লিংকগুলো দিন (প্রতি লাইনে ১টি লিংক অথবা যেকোনো শপের মেইন লিংক)
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-sm" onclick="bulkFetchStoreCatalog()" style="background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;border:none;font-weight:700;font-size:11.5px;padding:5px 12px;border-radius:8px;cursor:pointer;" title="বক্সে যেকোনো পার্টনার সাইটের লিংক দিয়ে ক্লিক করলে পুরো স্টোরের সব প্রোডাক্ট চলে আসবে">
                                        🌐 Load Entire Store Catalog
                                    </button>
                                    <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('bulkUrlsInput').value='';" style="font-size:11.5px;padding:4px 10px;">
                                        Clear URLs
                                    </button>
                                </div>
                            </div>
                            <textarea id="bulkUrlsInput" class="bulk-inp" rows="3" placeholder="এখানে এক বা একাধিক প্রোডাক্ট লিংক পেস্ট করুন (প্রতি লাইনে ১টি)...&#10;যেমন:&#10;https://example.shop/product?id=prod_1&#10;https://example.shop/product?id=prod_2&#10;(অথবা শুধু https://example.shop লিখে ওপরের 'Load Entire Store Catalog' বাটনে ক্লিক করুন)" style="font-size:12.5px;line-height:1.5;margin-bottom:10px;resize:vertical;"></textarea>

                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                    <button type="button" id="bulkFetchBtn" class="btn" onclick="bulkFetchFromUrls()" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;font-weight:700;font-size:13px;padding:8px 18px;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(79,70,229,0.3);">
                                        ⚡ Fetch &amp; Add to Editor List
                                    </button>
                                    <button type="button" class="btn btn-ghost btn-sm" onclick="bulkAddBlankRow()" style="font-weight:600;font-size:12px;">
                                        ➕ Add Blank Product Row
                                    </button>
                                </div>
                                <div id="bulkFetchStatus" style="font-size:12px;font-weight:700;color:#4f46e5;"></div>
                            </div>
                        </div>

                        <!-- Step 2: Batch Actions Toolbar -->
                        <div class="bulk-toolbar" id="bulkToolbar" style="display:none;">
                            <div class="bulk-toolbar-row">
                                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                    <label style="display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13px;cursor:pointer;color:#1e293b;">
                                        <input type="checkbox" id="bulkSelectAllCb" checked onchange="bulkToggleSelectAll(this.checked)" style="width:16px;height:16px;cursor:pointer;">
                                        <span>Select All (<span id="bulkSelectedCount">0</span>/<span id="bulkTotalCount">0</span>)</span>
                                    </label>
                                    <button type="button" class="btn btn-sm" onclick="bulkRegenerateSkus(false)" style="background:rgba(79,70,229,0.1);color:#4f46e5;border:1px solid rgba(79,70,229,0.3);font-weight:700;font-size:11.5px;padding:4px 10px;border-radius:7px;cursor:pointer;">
                                        ⚡ Fill Missing SKUs
                                    </button>
                                    <button type="button" class="btn btn-sm" onclick="bulkRegenerateSkus(true)" style="background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:11.5px;padding:4px 10px;border-radius:7px;cursor:pointer;" title="সব সিলেক্টেড প্রোডাক্টের নাম থেকে ২ অক্ষর + '-' + ৩/৪ সংখ্যা দিয়ে নতুন ইউনিক SKU তৈরি করুন">
                                        🔄 Auto-Generate All SKUs (XX-1234)
                                    </button>
                                </div>

                                <!-- Bulk Price Adjuster -->
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#fff;padding:5px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                                    <span style="font-size:11.5px;font-weight:700;color:#475569;">💰 Bulk Price:</span>
                                    <select id="bulkPriceMode" class="bulk-inp" style="width:auto;padding:4px 8px;font-size:12px;">
                                        <option value="add">Base Price +৳ (যোগ)</option>
                                        <option value="sub">Base Price -৳ (বিয়োগ)</option>
                                        <option value="set">Set Base Price (= ৳)</option>
                                        <option value="pct">Base Price +% (শতকরা বৃদ্ধি)</option>
                                        <option value="discount">Set Sale Discount (= ৳)</option>
                                    </select>
                                    <input type="number" id="bulkPriceVal" class="bulk-inp" placeholder="Amount" style="width:85px;padding:4px 8px;font-size:12px;">
                                    <button type="button" class="btn btn-primary btn-sm" onclick="bulkApplyPriceChange()" style="padding:4px 10px;font-size:11.5px;">Apply</button>
                                </div>
                            </div>

                            <!-- Bulk Category Assigner -->
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;">
                                    <span style="font-size:11.5px;font-weight:800;color:#334155;">🏷️ Batch Category:</span>
                                    <div id="bulkBatchCatPills" style="display:flex;flex-wrap:wrap;gap:5px;"></div>
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-sm" onclick="bulkApplyBatchCategories('add')" style="background:#4f46e5;color:#fff;border:none;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;" title="ওপরে টিক দেওয়া ক্যাটাগরিগুলো সব সিলেক্টেড প্রোডাক্টে যুক্ত করুন">
                                        ➕ Add to Selected
                                    </button>
                                    <button type="button" class="btn btn-sm" onclick="bulkApplyBatchCategories('replace')" style="background:#0f172a;color:#fff;border:none;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;" title="সব সিলেক্টেড প্রোডাক্টের ক্যাটাগরি ওপরে টিক দেওয়া ক্যাটাগরি দিয়ে পরিবর্তন করুন">
                                        🎯 Set Exact on Selected
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Per-Product Interactive Staging List -->
                        <div id="bulkStagingList">
                            <div style="text-align:center;padding:36px 20px;color:#94a3b8;border:1.5px dashed #e2e8f0;border-radius:12px;">
                                <div style="font-size:32px;margin-bottom:8px;">📦</div>
                                <div style="font-size:14px;font-weight:700;color:#475569;">এখনো কোনো প্রোডাক্ট লোড করা হয়নি</div>
                                <div style="font-size:12px;margin-top:4px;">ওপরের বক্সে প্রোডাক্টের লিংক পেস্ট করে <b>Fetch &amp; Add to Editor List</b> বাটনে ক্লিক করুন।</div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions & Progress -->
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
                        <div id="bulkSaveProgressText" style="font-size:12.5px;font-weight:700;color:#059669;"></div>
                        <div style="display:flex;gap:10px;align-items:center;margin-left:auto;">
                            <button type="button" class="btn btn-ghost" onclick="bulkClearAllStaged()" style="font-size:12.5px;">🗑️ Clear List</button>
                            <button type="button" class="btn btn-ghost" onclick="closeModal('bulkStudioModal')">Cancel</button>
                            <button type="button" class="btn btn-primary" id="bulkSaveAllBtn" onclick="bulkSaveSelectedProducts()" style="background:linear-gradient(135deg,#059669,#10b981);border:none;font-weight:800;padding:10px 22px;font-size:13.5px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">
                                🚀 Import &amp; Save Selected (<span id="bulkSaveBtnCount">0</span>)
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }
    }

    // ── Open Bulk Studio Modal ───────────────────────────────────────────────
    window.openBulkImportModal = function() {
        initBulkStudioUI();
        renderBulkBatchCategoryPills();
        renderBulkStagingList();
        var modal = document.getElementById('bulkStudioModal');
        if (modal) modal.classList.add('show');
    };

    var selectedBatchCatIds = new Set();

    function renderBulkBatchCategoryPills() {
        var wrap = document.getElementById('bulkBatchCatPills');
        if (!wrap) return;
        var cats = (typeof allCategories !== 'undefined' && Array.isArray(allCategories)) ? allCategories : [];
        if (!cats.length) {
            wrap.innerHTML = '<span style="font-size:11px;color:#94a3b8;">No categories created yet</span>';
            return;
        }
        wrap.innerHTML = cats.map(function(c) {
            var cid = String(c.id);
            var isAct = selectedBatchCatIds.has(cid);
            return '<span class="bulk-cat-pill ' + (isAct ? 'active' : '') + '" onclick="bulkToggleBatchCatPill(\'' + escAttr(cid) + '\')">' +
                (isAct ? '✓ ' : '+ ') + escHtml(c.name) +
            '</span>';
        }).join('');
    }

    window.bulkToggleBatchCatPill = function(cid) {
        cid = String(cid);
        if (selectedBatchCatIds.has(cid)) selectedBatchCatIds.delete(cid);
        else selectedBatchCatIds.add(cid);
        renderBulkBatchCategoryPills();
    };

    window.bulkApplyBatchCategories = function(mode) {
        var batchArr = Array.from(selectedBatchCatIds);
        if (mode === 'add' && !batchArr.length) {
            if (typeof showToast === 'function') showToast('প্রথমে Batch Category থেকে অন্তত ১টি ক্যাটাগরিতে ক্লিক করুন', 'warning');
            return;
        }
        var count = 0;
        bulkStagedItems.forEach(function(item) {
            if (!item.selected) return;
            count++;
            if (mode === 'replace') {
                item.category_ids = batchArr.slice();
            } else {
                var set = new Set((item.category_ids || []).map(String));
                batchArr.forEach(function(id) { set.add(String(id)); });
                item.category_ids = Array.from(set);
            }
        });
        renderBulkStagingList();
        if (typeof showToast === 'function') showToast('✅ ' + count + 'টি প্রোডাক্টে ক্যাটাগরি আপডেট হয়েছে!', 'success');
    };

    // ── Fetch Products from Multiple URLs ────────────────────────────────────
    window.bulkFetchFromUrls = async function() {
        var inp = document.getElementById('bulkUrlsInput');
        var btn = document.getElementById('bulkFetchBtn');
        var statusEl = document.getElementById('bulkFetchStatus');
        if (!inp || !btn) return;

        var rawText = inp.value.trim();
        if (!rawText) {
            if (typeof showToast === 'function') showToast('দয়া করে অন্তত ১টি প্রোডাক্টের লিংক পেস্ট করুন', 'error');
            inp.focus();
            return;
        }

        // Split by newline, comma, or whitespace containing http
        var urls = rawText
            .split(/[\r\n,]+/)
            .map(function(s) { return s.trim(); })
            .filter(Boolean);

        if (!urls.length) return;

        var origBtnHtml = btn.innerHTML;
        btn.disabled = true;
        var batchSkus = new Set();
        var addedCount = 0;
        var failedCount = 0;

        for (var i = 0; i < urls.length; i++) {
            var u = urls[i];
            btn.innerHTML = '⏳ Fetching (' + (i + 1) + '/' + urls.length + ')...';
            if (statusEl) statusEl.textContent = '🔍 লোড হচ্ছে (' + (i + 1) + '/' + urls.length + '): ' + u.substring(0, 45) + '...';

            try {
                var item = await fetchSingleProductByUrl(u);
                if (item) {
                    // Ensure SKU is unique across current batch too
                    if (batchSkus.has(item.sku.toUpperCase())) {
                        item.sku = window.generateAutoSku(item.name, batchSkus);
                    }
                    batchSkus.add(item.sku.toUpperCase());
                    bulkStagedItems.push(item);
                    addedCount++;
                } else {
                    failedCount++;
                }
            } catch (e) {
                failedCount++;
            }
            renderBulkStagingList();
        }

        btn.innerHTML = origBtnHtml;
        btn.disabled = false;

        if (addedCount > 0) {
            inp.value = '';
            if (statusEl) statusEl.textContent = '✅ ' + addedCount + 'টি প্রোডাক্ট লোড হয়েছে!' + (failedCount ? ' (' + failedCount + 'টি ব্যর্থ)' : '');
            if (typeof showToast === 'function') showToast('✅ ' + addedCount + 'টি প্রোডাক্ট এডিটর লিস্টে যুক্ত হয়েছে!', 'success');
        } else {
            if (statusEl) statusEl.textContent = '❌ কোনো প্রোডাক্ট পাওয়া যায়নি। যদি পুরো স্টোর লোড করতে চান তবে "Load Entire Store Catalog" বাটনে ক্লিক করুন।';
            if (typeof showToast === 'function') showToast('প্রোডাক্ট ডাটা পাওয়া যায়নি', 'error');
        }
    };

    // ── Fetch Entire Store Catalog from a Partner Domain URL ─────────────────
    window.bulkFetchStoreCatalog = async function() {
        var inp = document.getElementById('bulkUrlsInput');
        var statusEl = document.getElementById('bulkFetchStatus');
        var raw = inp ? inp.value.trim().split(/[\r\n,\s]+/)[0] : '';
        if (!raw) {
            raw = prompt('যেই সাইট থেকে সব প্রোডাক্ট কপি করতে চান তার লিংক দিন (যেমন: https://royalpanjabi.shop):') || '';
        }
        raw = raw.trim();
        if (!raw) return;
        if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

        var parsed;
        try { parsed = new URL(raw); } catch (e) {
            if (typeof showToast === 'function') showToast('সঠিক ওয়েবসাইট লিংক দিন!', 'error');
            return;
        }

        var origin = parsed.origin;
        if (statusEl) statusEl.textContent = '🌐 ' + origin + ' থেকে সম্পূর্ণ প্রোডাক্ট ক্যাটালগ লোড করা হচ্ছে...';

        var catalog = await getDomainCatalog(origin);
        if (!catalog || !Array.isArray(catalog.products) || !catalog.products.length) {
            if (statusEl) statusEl.textContent = '❌ এই সাইটে সরাসরি ক্যাটালগ API পাওয়া যায়নি। প্রোডাক্টের লিংকগুলো পেস্ট করে Fetch করুন।';
            if (typeof showToast === 'function') showToast('সরাসরি ক্যাটালগ পাওয়া যায়নি, প্রোডাক্ট লিংক পেস্ট করুন', 'warning');
            return;
        }

        var batchSkus = new Set();
        var added = 0;
        catalog.products.forEach(function(p) {
            var pUrl = origin + '/product?id=' + encodeURIComponent(p.id);
            var staged = normalizeRawProductToStagedItem(p, pUrl, batchSkus);
            bulkStagedItems.push(staged);
            added++;
        });

        if (inp) inp.value = '';
        renderBulkStagingList();
        if (statusEl) statusEl.textContent = '✅ ' + origin + ' থেকে মোট ' + added + 'টি প্রোডাক্ট লোড হয়েছে!';
        if (typeof showToast === 'function') showToast('✅ স্টোর থেকে ' + added + 'টি প্রোডাক্ট লোড হয়েছে!', 'success');
    };

    window.bulkAddBlankRow = function() {
        var item = normalizeRawProductToStagedItem({
            name: 'New Product ' + (bulkStagedItems.length + 1),
            base_price: 500,
            flash_sale_price: 0,
            gallery_images: []
        }, '');
        bulkStagedItems.unshift(item);
        renderBulkStagingList();
    };

    // ── Render Interactive Staging List ──────────────────────────────────────
    function renderBulkStagingList() {
        var listEl = document.getElementById('bulkStagingList');
        var toolbar = document.getElementById('bulkToolbar');
        var selCountEl = document.getElementById('bulkSelectedCount');
        var totCountEl = document.getElementById('bulkTotalCount');
        var saveBtnCountEl = document.getElementById('bulkSaveBtnCount');
        var selectAllCb = document.getElementById('bulkSelectAllCb');

        if (!listEl) return;

        var total = bulkStagedItems.length;
        var selectedCount = bulkStagedItems.filter(function(x) { return x.selected; }).length;

        if (toolbar) toolbar.style.display = total > 0 ? 'flex' : 'none';
        if (selCountEl) selCountEl.textContent = selectedCount;
        if (totCountEl) totCountEl.textContent = total;
        if (saveBtnCountEl) saveBtnCountEl.textContent = selectedCount;
        if (selectAllCb) selectAllCb.checked = (total > 0 && selectedCount === total);

        if (total === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:36px 20px;color:#94a3b8;border:1.5px dashed #e2e8f0;border-radius:12px;">
                    <div style="font-size:32px;margin-bottom:8px;">📦</div>
                    <div style="font-size:14px;font-weight:700;color:#475569;">এখনো কোনো প্রোডাক্ট লোড করা হয়নি</div>
                    <div style="font-size:12px;margin-top:4px;">ওপরের বক্সে প্রোডাক্টের লিংক পেস্ট করে <b>Fetch &amp; Add to Editor List</b> বাটনে ক্লিক করুন।</div>
                </div>
            `;
            return;
        }

        var cats = (typeof allCategories !== 'undefined' && Array.isArray(allCategories)) ? allCategories : [];

        listEl.innerHTML = bulkStagedItems.map(function(item, idx) {
            var thumb = (item.gallery_images && item.gallery_images[0]) ||
                        (item.variants && item.variants[0] && item.variants[0].imageUrl) || '';
            var finalPrice = Math.max(0, (parseInt(item.base_price, 10) || 0) - (parseInt(item.flash_sale_price, 10) || 0));
            var itemCatSet = new Set((item.category_ids || []).map(String));

            var catPillsHtml = cats.length ? cats.map(function(c) {
                var cid = String(c.id);
                var isChecked = itemCatSet.has(cid);
                return '<span class="bulk-cat-pill ' + (isChecked ? 'active' : '') + '" onclick="bulkToggleItemCategory(' + idx + ', \'' + escAttr(cid) + '\')">' +
                    (isChecked ? '✓ ' : '+ ') + escHtml(c.name) +
                '</span>';
            }).join('') : '<span style="font-size:11px;color:#94a3b8;">No categories available</span>';

            var galleryText = (item.gallery_images || []).join('\n');

            return `
                <div class="bulk-item-card ${item.selected ? '' : 'unselected'}" id="bulk-card-${idx}">
                    <div class="bulk-item-grid">
                        <!-- 1. Select Checkbox -->
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                            <input type="checkbox" ${item.selected ? 'checked' : ''} onchange="bulkToggleItemSelect(${idx}, this.checked)" style="width:17px;height:17px;cursor:pointer;">
                            <span style="font-size:10px;font-weight:800;color:#94a3b8;">#${idx + 1}</span>
                        </div>

                        <!-- 2. Thumbnail + Photo/Variant Badges -->
                        <div style="position:relative;">
                            ${thumb
                                ? `<img src="${escAttr(thumb)}" class="bulk-item-thumb" onerror="this.style.opacity='0.2'">`
                                : `<div class="bulk-item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;color:#94a3b8;">🖼️</div>`
                            }
                            <div style="font-size:9.5px;font-weight:700;color:#475569;text-align:center;margin-top:2px;">
                                📸 ${(item.gallery_images || []).length} | 🎨 ${(item.variants || []).length}
                            </div>
                        </div>

                        <!-- 3. Product Name -->
                        <div>
                            <label class="bulk-mini-label">Product Name *</label>
                            <input type="text" class="bulk-inp" value="${escAttr(item.name)}" oninput="bulkUpdateField(${idx}, 'name', this.value)" placeholder="Product Name">
                        </div>

                        <!-- 4. Auto SKU (XX-1234) -->
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                                <span class="bulk-mini-label" style="margin:0;">SKU (Auto XX-1234)</span>
                                <button type="button" onclick="bulkRegenSingleSku(${idx})" style="background:rgba(79,70,229,0.12);color:#4f46e5;border:none;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:800;cursor:pointer;" title="প্রোডাক্টের নাম থেকে নতুন SKU তৈরি করুন">🔄 Auto</button>
                            </div>
                            <input type="text" class="bulk-inp" id="bulk-sku-${idx}" value="${escAttr(item.sku)}" oninput="bulkUpdateField(${idx}, 'sku', this.value)" style="font-weight:700;color:#4338ca;letter-spacing:0.3px;">
                        </div>

                        <!-- 5. Base Price -->
                        <div>
                            <label class="bulk-mini-label">Base Price (৳) *</label>
                            <input type="number" class="bulk-inp" value="${item.base_price}" oninput="bulkUpdatePrice(${idx}, 'base_price', this.value)" style="font-weight:700;">
                        </div>

                        <!-- 6. Flash Sale Discount -->
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                                <span class="bulk-mini-label" style="margin:0;">Discount (৳)</span>
                                <span id="bulk-final-${idx}" style="font-size:10px;font-weight:800;color:#059669;">= ৳${finalPrice}</span>
                            </div>
                            <input type="number" class="bulk-inp" value="${item.flash_sale_price}" oninput="bulkUpdatePrice(${idx}, 'flash_sale_price', this.value)">
                        </div>

                        <!-- 7. Row Actions -->
                        <div style="display:flex;gap:5px;align-items:center;">
                            <button type="button" class="btn btn-ghost btn-sm" onclick="bulkToggleDrawer(${idx})" style="padding:6px 9px;font-size:11.5px;font-weight:700;" title="ডেসক্রিপশন, ছবি ও ভ্যারিয়েন্ট এডিট করুন">
                                📝 Details
                            </button>
                            <button type="button" class="btn btn-danger btn-sm" onclick="bulkRemoveItem(${idx})" style="padding:6px 9px;font-size:11.5px;" title="এই প্রোডাক্টটি লিস্ট থেকে বাদ দিন">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <!-- Per-Product Isolated Category Selector -->
                    <div class="bulk-item-cats">
                        <span style="font-size:11px;font-weight:800;color:#475569;margin-right:4px;">🏷️ Categories (${itemCatSet.size}):</span>
                        ${catPillsHtml}
                    </div>

                    <!-- Expandable Details Drawer (Description, Gallery Images, Tags) -->
                    <div class="bulk-drawer ${item.expanded ? 'open' : ''}" id="bulk-drawer-${idx}">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <div>
                                <label class="bulk-mini-label">Description (HTML / Text)</label>
                                <textarea class="bulk-inp" rows="4" oninput="bulkUpdateField(${idx}, 'description', this.value)" style="resize:vertical;">${escHtml(item.description || '')}</textarea>
                            </div>
                            <div>
                                <label class="bulk-mini-label">Gallery Image URLs (প্রতি লাইনে ১টি ছবির লিংক)</label>
                                <textarea class="bulk-inp" rows="4" oninput="bulkUpdateGalleryText(${idx}, this.value)" style="resize:vertical;">${escHtml(galleryText)}</textarea>
                            </div>
                        </div>
                        <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:10px;">
                            <div style="flex:1;min-width:220px;">
                                <label class="bulk-mini-label">SEO Focus Tags / Keywords (কমা দিয়ে)</label>
                                <input type="text" class="bulk-inp" value="${escAttr(item.tags || '')}" oninput="bulkUpdateField(${idx}, 'tags', this.value)" placeholder="e.g. luxury watch, mens fashion, waterproof">
                            </div>
                            <div style="display:flex;gap:14px;align-items:center;padding-top:14px;">
                                <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;cursor:pointer;">
                                    <input type="checkbox" ${item.is_active ? 'checked' : ''} onchange="bulkUpdateField(${idx}, 'is_active', this.checked)"> Active
                                </label>
                                <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;cursor:pointer;">
                                    <input type="checkbox" ${item.is_featured ? 'checked' : ''} onchange="bulkUpdateField(${idx}, 'is_featured', this.checked)"> Featured
                                </label>
                                <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;cursor:pointer;">
                                    <input type="checkbox" ${item.is_add_once ? 'checked' : ''} onchange="bulkUpdateField(${idx}, 'is_add_once', this.checked)"> Add-Once
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── Per-Item & Batch Event Handlers ──────────────────────────────────────
    window.bulkToggleSelectAll = function(checked) {
        bulkStagedItems.forEach(function(item) { item.selected = Boolean(checked); });
        renderBulkStagingList();
    };

    window.bulkToggleItemSelect = function(idx, checked) {
        if (!bulkStagedItems[idx]) return;
        bulkStagedItems[idx].selected = Boolean(checked);
        renderBulkStagingList();
    };

    window.bulkUpdateField = function(idx, field, val) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        item[field] = val;
        // If user edits product name and SKU was auto-generated, update the 2-letter prefix automatically!
        if (field === 'name' && item.skuAuto) {
            var newPrefix = extractSkuPrefix(val);
            var parts = (item.sku || '').split('-');
            var numPart = (parts.length > 1 && /^\d+$/.test(parts[1])) ? parts[1] : Math.floor(1000 + Math.random() * 9000);
            item.sku = newPrefix + '-' + numPart;
            var skuInp = document.getElementById('bulk-sku-' + idx);
            if (skuInp) skuInp.value = item.sku;
        }
        if (field === 'sku') {
            item.skuAuto = false;
        }
    };

    window.bulkUpdatePrice = function(idx, field, val) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        item[field] = parseInt(val, 10) || 0;
        var finalPrice = Math.max(0, (parseInt(item.base_price, 10) || 0) - (parseInt(item.flash_sale_price, 10) || 0));
        var badge = document.getElementById('bulk-final-' + idx);
        if (badge) badge.textContent = '= ৳' + finalPrice;
    };

    window.bulkUpdateGalleryText = function(idx, text) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        item.gallery_images = (text || '')
            .split(/[\r\n,]+/)
            .map(function(s) { return s.trim(); })
            .filter(Boolean);
    };

    window.bulkToggleItemCategory = function(idx, cid) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        cid = String(cid);
        var arr = Array.isArray(item.category_ids) ? item.category_ids.map(String) : [];
        var pos = arr.indexOf(cid);
        if (pos > -1) arr.splice(pos, 1);
        else arr.push(cid);
        item.category_ids = arr;
        renderBulkStagingList();
    };

    window.bulkToggleDrawer = function(idx) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        item.expanded = !item.expanded;
        var drawer = document.getElementById('bulk-drawer-' + idx);
        if (drawer) drawer.classList.toggle('open', item.expanded);
    };

    window.bulkRemoveItem = function(idx) {
        bulkStagedItems.splice(idx, 1);
        renderBulkStagingList();
    };

    window.bulkClearAllStaged = function() {
        if (!bulkStagedItems.length) return;
        bulkStagedItems = [];
        renderBulkStagingList();
    };

    window.bulkRegenSingleSku = function(idx) {
        var item = bulkStagedItems[idx];
        if (!item) return;
        item.sku = '';
        item.sku = window.generateAutoSku(item.name);
        item.skuAuto = true;
        var skuInp = document.getElementById('bulk-sku-' + idx);
        if (skuInp) skuInp.value = item.sku;
    };

    window.bulkRegenerateSkus = function(overwriteAll) {
        var used = new Set();
        var count = 0;
        bulkStagedItems.forEach(function(item) {
            if (!item.selected) {
                if (item.sku) used.add(item.sku.toUpperCase());
                return;
            }
            if (overwriteAll || !item.sku || !item.sku.trim()) {
                item.sku = '';
                var fresh = window.generateAutoSku(item.name, used);
                item.sku = fresh;
                item.skuAuto = true;
                used.add(fresh.toUpperCase());
                count++;
            } else {
                used.add(item.sku.toUpperCase());
            }
        });
        renderBulkStagingList();
        if (typeof showToast === 'function') {
            showToast('✅ ' + count + 'টি প্রোডাক্টে নতুন Auto-SKU (XX-1234) সেট করা হয়েছে!', 'success');
        }
    };

    window.bulkApplyPriceChange = function() {
        var modeEl = document.getElementById('bulkPriceMode');
        var valEl  = document.getElementById('bulkPriceVal');
        if (!modeEl || !valEl) return;
        var mode = modeEl.value;
        var amount = parseFloat(valEl.value);
        if (isNaN(amount)) {
            if (typeof showToast === 'function') showToast('টাকার পরিমাণ বা সংখ্যা লিখুন', 'warning');
            valEl.focus();
            return;
        }

        var count = 0;
        bulkStagedItems.forEach(function(item) {
            if (!item.selected) return;
            count++;
            var cur = parseInt(item.base_price, 10) || 0;
            if (mode === 'add') item.base_price = Math.max(0, Math.round(cur + amount));
            else if (mode === 'sub') item.base_price = Math.max(0, Math.round(cur - amount));
            else if (mode === 'set') item.base_price = Math.max(0, Math.round(amount));
            else if (mode === 'pct') item.base_price = Math.max(0, Math.round(cur + (cur * amount / 100)));
            else if (mode === 'discount') item.flash_sale_price = Math.max(0, Math.round(amount));
        });
        renderBulkStagingList();
        if (typeof showToast === 'function') showToast('💰 ' + count + 'টি প্রোডাক্টের দাম আপডেট করা হয়েছে!', 'success');
    };

    // ── Save Single Staged Item to Active DB Provider ────────────────────────
    async function saveOneStagedProduct(item) {
        var name = (item.name || '').trim();
        if (!name) throw new Error('Product name is empty');

        var sku = (item.sku || '').trim();
        if (!sku) {
            sku = window.generateAutoSku(name);
            item.sku = sku;
        }

        var catIds = Array.isArray(item.category_ids) ? item.category_ids.map(String) : [];
        var cats = (typeof allCategories !== 'undefined' && Array.isArray(allCategories)) ? allCategories : [];
        var selectedCatNames = catIds.map(function(cid) {
            var found = cats.find(function(c) { return String(c.id) === String(cid); });
            return found ? found.name : '';
        }).filter(Boolean);

        var mergedTagArray = [];
        if (typeof ImageSeoInjector !== 'undefined') {
            mergedTagArray = ImageSeoInjector.buildMergedTags({
                productName: name,
                categoryNames: selectedCatNames,
                productTags: item.tags || ''
            });
        } else if (item.tags) {
            mergedTagArray = item.tags.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        }
        var combinedTagsVal = mergedTagArray.length ? mergedTagArray.join(', ') : (item.tags || '');
        var seoSlug = (item.slug || '').trim() || ((typeof ImageSeoInjector !== 'undefined') ? ImageSeoInjector.slugify(name) : name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

        var payload = {
            name:             name,
            sku:              sku,
            description:      item.description || '',
            base_price:       parseInt(item.base_price, 10) || 0,
            flash_sale_price: parseInt(item.flash_sale_price, 10) || 0,
            flash_sale_end:   null,
            video_url:        item.video_url || null,
            video_type:       item.video_type || 'auto',
            is_active:        Boolean(item.is_active),
            is_featured:      Boolean(item.is_featured),
            is_add_once:      Boolean(item.is_add_once),
            tags:             combinedTagsVal || null,
            seo_keywords:     combinedTagsVal || null,
            seo_title:        item.seo_title || name,
            seo_description:  item.seo_description || null,
            slug:             seoSlug || null,
            gallery_images:   Array.isArray(item.gallery_images) ? item.gallery_images.filter(Boolean) : [],
            variants:         Array.isArray(item.variants) ? item.variants : [],
            category_ids:     catIds
        };

        if (CONFIG.DB_PROVIDER === 'cf_db') {
            var reqUrl = (CONFIG.HF_API_BASE ? CONFIG.HF_API_BASE.replace(/\/+$/, '') : '') + '/api/add-product';
            var r = await fetch(reqUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('admin_token') || '')
                },
                body: JSON.stringify(payload)
            });
            var res = await r.json();
            if (!res.success) throw new Error(res.error || 'Failed to save product');
            return res;
        } else if (CONFIG.DB_PROVIDER === 'supabase') {
            var supaPayload = Object.assign({}, payload);
            delete supaPayload.category_ids;
            var ins = await supabaseClient.from('products').insert([supaPayload]).select();
            if (ins.error) throw new Error(ins.error.message);
            var newId = ins.data && ins.data[0] && ins.data[0].id;
            if (newId && catIds.length) {
                var rows = catIds.map(function(cid) { return { product_id: newId, category_id: cid }; });
                await supabaseClient.from('product_categories').insert(rows);
            }
            return ins;
        } else if (CONFIG.DB_PROVIDER === 'appwrite') {
            var awPayload = Object.assign({}, payload, {
                variants: JSON.stringify(payload.variants || [])
            });
            delete awPayload.category_ids;
            var doc = await appwriteDatabases.createDocument(APP_DB, 'products', AppwriteID.unique(), awPayload);
            if (doc && doc.$id && catIds.length) {
                for (var c = 0; c < catIds.length; c++) {
                    await appwriteDatabases.createDocument(APP_DB, 'product_categories', AppwriteID.unique(), {
                        product_id: doc.$id,
                        category_id: catIds[c]
                    });
                }
            }
            return doc;
        }
    }

    // ── Bulk Save Selected Products ──────────────────────────────────────────
    window.bulkSaveSelectedProducts = async function() {
        if (isBulkSaving) return;
        var toSave = bulkStagedItems.filter(function(x) { return x.selected; });
        if (!toSave.length) {
            if (typeof showToast === 'function') showToast('সেভ করার জন্য অন্তত ১টি প্রোডাক্ট সিলেক্ট করুন', 'warning');
            return;
        }

        isBulkSaving = true;
        var btn = document.getElementById('bulkSaveAllBtn');
        var progEl = document.getElementById('bulkSaveProgressText');
        var origBtnHtml = btn ? btn.innerHTML : '';
        if (btn) btn.disabled = true;

        var savedCount = 0;
        var failedCount = 0;
        var savedUids = new Set();

        for (var i = 0; i < toSave.length; i++) {
            var item = toSave[i];
            if (btn) btn.innerHTML = '⏳ Saving (' + (i + 1) + '/' + toSave.length + ')...';
            if (progEl) progEl.textContent = '⏳ সেভ হচ্ছে (' + (i + 1) + '/' + toSave.length + '): ' + item.name + ' [' + item.sku + ']';

            try {
                await saveOneStagedProduct(item);
                savedCount++;
                savedUids.add(item._uid);
            } catch (err) {
                console.error('Bulk save error for', item.name, err);
                failedCount++;
            }
        }

        // Remove successfully saved items from staging list
        bulkStagedItems = bulkStagedItems.filter(function(x) { return !savedUids.has(x._uid); });

        isBulkSaving = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origBtnHtml;
        }

        renderBulkStagingList();

        if (typeof loadProducts === 'function') {
            loadProducts();
        }

        if (savedCount > 0 && failedCount === 0) {
            if (progEl) progEl.textContent = '✅ সফলভাবে ' + savedCount + 'টি প্রোডাক্ট সেভ হয়েছে!';
            if (typeof showToast === 'function') showToast('🎉 সফলভাবে ' + savedCount + 'টি প্রোডাক্ট স্টোরে যুক্ত হয়েছে!', 'success');
            setTimeout(function() {
                if (bulkStagedItems.length === 0 && typeof closeModal === 'function') {
                    closeModal('bulkStudioModal');
                }
            }, 900);
        } else if (savedCount > 0) {
            if (progEl) progEl.textContent = '⚠️ ' + savedCount + 'টি সেভ হয়েছে, ' + failedCount + 'টি ব্যর্থ হয়েছে।';
            if (typeof showToast === 'function') showToast(savedCount + 'টি সেভ হয়েছে, ' + failedCount + 'টি ব্যর্থ', 'warning');
        } else {
            if (progEl) progEl.textContent = '❌ প্রোডাক্ট সেভ করা যায়নি।';
            if (typeof showToast === 'function') showToast('প্রোডাক্ট সেভ ব্যর্থ হয়েছে', 'error');
        }
    };

    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBulkStudioUI);
    } else {
        initBulkStudioUI();
    }
})();
