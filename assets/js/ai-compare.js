/**
 * AI Product Comparison Feature
 * Hold-Click (Long Press) / Right-Click to compare 2 products
 * Detailed side-by-side comparison powered by Google Gemini API
 * Transmits full product information: Names, Regular & Discount Prices, Features, Descriptions & Specs.
 */

(function (window) {
    'use strict';

    var productA = null;
    var productB = null;

    function initCompareUI() {
        if (document.getElementById('aiCompareDock')) return;

        // Bottom dock
        var dock = document.createElement('div');
        dock.className = 'ai-compare-dock';
        dock.id = 'aiCompareDock';
        dock.innerHTML = [
            '<div class="ai-compare-slot" id="aiSlotA">',
            '  <img class="ai-compare-slot-thumb" id="aiSlotImgA" src="" alt="">',
            '  <div style="font-size:12px;font-weight:700;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="aiSlotTitleA">Product 1</div>',
            '</div>',
            '<div class="ai-compare-vs">VS</div>',
            '<div class="ai-compare-slot" id="aiSlotB">',
            '  <div class="ai-compare-slot-thumb" id="aiSlotImgB" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:#94a3b8;">+</div>',
            '  <div style="font-size:12px;color:#cbd5e1;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="aiSlotTitleB">Select 2nd Product</div>',
            '</div>',
            '<button onclick="window.AiCompare.clear()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;margin-left:4px;" title="Cancel">✕</button>'
        ].join('\n');
        document.body.appendChild(dock);

        // Compare Modal
        var modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'ai-modal-backdrop';
        modalBackdrop.id = 'aiCompareModal';
        modalBackdrop.innerHTML = [
            '<div class="ai-compare-modal-content">',
            '  <!-- Header -->',
            '  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:18px;">',
            '    <div style="display:flex;align-items:center;gap:10px;">',
            '      <span style="font-size:24px;">⚖️</span>',
            '      <div>',
            '        <h2 style="font-size:18px;font-weight:800;color:#1e293b;margin:0;">AI Product Comparison</h2>',
            '        <div style="font-size:12px;color:#64748b;">Powered by Google Gemini Full Specs & Price Analysis</div>',
            '      </div>',
            '    </div>',
            '    <button onclick="window.AiCompare.closeModal()" style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>',
            '  </div>',
            '',
            '  <!-- Side-by-Side Product Cards -->',
            '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;" id="aiCompareCards">',
            '    <!-- Populated dynamically -->',
            '  </div>',
            '',
            '  <!-- AI Analysis Content -->',
            '  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:16px;">',
            '    <div style="font-size:13px;font-weight:800;color:#7c3aed;margin-bottom:10px;display:flex;align-items:center;gap:6px;">',
            '      <span>✨</span> Gemini AI Comparative Breakdown:',
            '    </div>',
            '    <div id="aiCompareResult" style="font-size:13.5px;color:#334155;line-height:1.7;">',
            '      <div style="display:flex;align-items:center;gap:10px;padding:20px 0;justify-content:center;">',
            '        <span class="ai-dot" style="background:#7c3aed;"></span>',
            '        <span class="ai-dot" style="background:#7c3aed;"></span>',
            '        <span class="ai-dot" style="background:#7c3aed;"></span>',
            '        <span style="font-size:13px;color:#64748b;">AI দুটি পণ্যের সম্পূর্ণ তথ্য ও ফিচার অ্যানালাইজ করছে...</span>',
            '      </div>',
            '    </div>',
            '  </div>',
            '',
            '  <!-- Footer Actions -->',
            '  <div style="display:flex;justify-content:flex-end;gap:10px;">',
            '    <button class="btn btn-outline btn-sm" onclick="window.AiCompare.clear()">🔄 New Comparison</button>',
            '    <button class="btn btn-primary btn-sm" style="background:var(--ai-gradient);border:none;" onclick="window.AiCompare.closeModal()">Done</button>',
            '  </div>',
            '</div>'
        ].join('\n');
        document.body.appendChild(modalBackdrop);

        modalBackdrop.addEventListener('click', function(e) {
            if (e.target === modalBackdrop) window.AiCompare.closeModal();
        });
    }

    /**
     * Format all product info (name, prices, discount, features, description, specs) into structured AI text
     */
    function formatProductForAiPrompt(p, label) {
        var lines = [];
        lines.push('【' + label + '】');
        lines.push('• পণ্যের নাম (Product Name): ' + (p.name || 'পণ্য'));

        // Pricing & Discounts
        if (p.regular_price && p.sale_price && String(p.regular_price) !== String(p.sale_price)) {
            lines.push('• নিয়মিত মূল দাম (Regular Base Price): ৳' + p.regular_price);
            lines.push('• বর্তমান অফার/ডিসকাউন্ট মূল্য (Discounted Price): ৳' + p.sale_price);
            if (p.discount_text) {
                lines.push('• ডিসকাউন্ট সুবিধা (Savings): ' + p.discount_text);
            }
        } else {
            lines.push('• বর্তমান মূল্য (Price): ' + (p.price || (p.sale_price ? '৳' + p.sale_price : (p.base_price ? '৳' + p.base_price : '৳0'))));
        }

        if (p.category_name || p.category) {
            lines.push('• ক্যাটাগরি (Category): ' + (p.category_name || p.category));
        }

        if (p.sku) {
            lines.push('• SKU / প্রোডাক্ট কোড: ' + p.sku);
        }

        if (p.stock !== undefined || p.stock_status) {
            lines.push('• স্টক ও প্রাপ্যতা (Stock Status): ' + (p.stock_status || (Number(p.stock) > 0 ? 'ইন স্টক (' + p.stock + ' টি)' : 'স্টক আছে')));
        }

        if (p.rating) {
            lines.push('• কাস্টমার রেটিং (Rating): ' + p.rating + '★');
        }

        // Full description & features
        var fullDesc = p.description || p.details || '';
        if (fullDesc) {
            var cleanDesc = fullDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanDesc) {
                lines.push('• বিস্তারিত বিবরণ ও ফিচার (Description & Features): ' + cleanDesc.slice(0, 1200));
            }
        }

        if (p.features) {
            var fStr = Array.isArray(p.features) ? p.features.join(', ') : p.features;
            lines.push('• হাইলাইটেড ফিচারসমূহ: ' + fStr);
        }

        return lines.join('\n');
    }

    /**
     * Render side-by-side card with both regular price, discounted price and badge
     */
    function renderCardHtml(p) {
        var priceHtml = '';
        if (p.regular_price && p.sale_price && String(p.regular_price) !== String(p.sale_price)) {
            priceHtml = [
                '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">',
                '  <span style="font-size:12px;color:#94a3b8;text-decoration:line-through;">৳' + p.regular_price + '</span>',
                '  <span style="font-weight:800;font-size:16px;color:var(--ai-primary,#7c3aed);">৳' + p.sale_price + '</span>',
                (p.discount_text ? '  <span style="background:#fef2f2;color:#ef4444;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">' + p.discount_text + '</span>' : ''),
                '</div>'
            ].join('\n');
        } else {
            priceHtml = '<div style="font-weight:800;font-size:16px;color:var(--ai-primary,#7c3aed);margin-bottom:6px;">' + (p.price || '৳0') + '</div>';
        }

        var catBadge = (p.category_name || p.category) ? '<div style="font-size:11px;color:#64748b;margin-bottom:4px;">' + (p.category_name || p.category) + '</div>' : '';

        return [
            '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.03);">',
            '  <img src="' + (p.image || '') + '" style="width:100%;height:130px;object-fit:contain;border-radius:8px;margin-bottom:8px;background:#f8fafc;">',
            '  <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px;">' + (p.name || 'পণ্য') + '</div>',
            catBadge,
            priceHtml,
            '  <a href="product.html?id=' + (p.id || '') + '" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;border-radius:6px;">View Product</a>',
            '</div>'
        ].join('\n');
    }

    var AiCompare = {
        selectProduct: function (prod) {
            initCompareUI();

            if (!productA) {
                productA = prod;
                this.updateDock();
                if (typeof showToast === 'function') {
                    showToast('⚖️ ১ম পণ্য নির্বাচিত! এবার অন্য যেকোনো পণ্যের উপর চেপে ধরে (Hold) ২য় পণ্য সিলেক্ট করুন।', 'info');
                }
            } else if (!productB && (String(productA.id) !== String(prod.id))) {
                productB = prod;
                this.updateDock();
                this.openModal();
            } else if (String(productA.id) === String(prod.id)) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ অনুগ্রহ করে তুলনা করার জন্য অন্য একটি ২য় পণ্য সিলেক্ট করুন।', 'warning');
                }
            }
        },

        updateDock: function () {
            var dock = document.getElementById('aiCompareDock');
            var imgA = document.getElementById('aiSlotImgA');
            var titleA = document.getElementById('aiSlotTitleA');
            var imgB = document.getElementById('aiSlotImgB');
            var titleB = document.getElementById('aiSlotTitleB');

            if (!dock) return;

            if (productA) {
                dock.classList.add('active');
                if (imgA) { imgA.src = productA.image || ''; imgA.style.display = 'block'; }
                if (titleA) titleA.textContent = productA.name || 'Product 1';
            }

            if (productB) {
                if (imgB) {
                    imgB.innerHTML = '<img src="' + (productB.image || '') + '" style="width:100%;height:100%;border-radius:8px;object-fit:cover;">';
                }
                if (titleB) titleB.textContent = productB.name || 'Product 2';
            } else {
                if (imgB) imgB.innerHTML = '+';
                if (titleB) titleB.textContent = 'Select 2nd Product';
            }
        },

        openModal: async function () {
            var modal = document.getElementById('aiCompareModal');
            var cards = document.getElementById('aiCompareCards');
            var result = document.getElementById('aiCompareResult');

            if (!modal || !productA || !productB) return;

            cards.innerHTML = renderCardHtml(productA) + renderCardHtml(productB);

            result.innerHTML = [
                '<div style="display:flex;align-items:center;gap:10px;padding:24px 0;justify-content:center;">',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span style="font-size:13px;color:#64748b;">AI দুটি পণ্যের সম্পূর্ণ তথ্য, দাম ও ফিচার বিশ্লেষণ করছে...</span>',
                '</div>'
            ].join('\n');

            modal.classList.add('active');

            try {
                var prompt = [
                    'বাংলাদেশী ক্রেতার জন্য নিচের দুটি পণ্যের গভীর ও তথ্যবহুল তুলনা (Deep Comparison) তৈরি করুন।',
                    'উভয় পণ্যের নাম, আসল দাম, ডিসকাউন্ট অফার, স্পেসিফিকেশন এবং ফিচারের সকল তথ্যের ভিত্তিতে নিখুঁত বিশ্লেষণ দিন:',
                    '',
                    formatProductForAiPrompt(productA, 'পণ্য ১ (Product A)'),
                    '',
                    formatProductForAiPrompt(productB, 'পণ্য ২ (Product B)'),
                    '',
                    'দয়া করে নিচের পয়েন্ট অনুযায়ী বাংলায় সুন্দর ও আকর্ষণীয় বুলেট পয়েন্ট আকারে উত্তর দিন:',
                    '1. 🔍 প্রধান স্পেসিফিকেশন ও ফিচারের পার্থক্য (Key Feature & Spec Comparison)',
                    '2. 💰 দাম, ডিসকাউন্ট ও ভ্যালু ফর মানি (Pricing, Discount & Value Analysis)',
                    '3. 🎯 কোন ধরনের ক্রেতার জন্য কোনটি সেরা পছন্দ (Who Should Buy Which)',
                    '4. 🏆 চূড়ান্ত রায় ও সুপারিশ (AI Final Verdict & Recommendation)'
                ].join('\n');

                var res = await window.AIConfig.generateText({
                    model: 'gemini-3.5-flash',
                    prompt: prompt,
                    systemInstruction: 'You are an expert e-commerce product comparison analyst for Bangladeshi shoppers. Provide structured, fair, and comprehensive comparison in Bengali with bullet points and bold highlights.'
                });

                var formattedText = (res.text || 'তুলনা সম্পন্ন হয়েছে।')
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
                    .replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin:8px 0;padding-left:20px;line-height:1.7;">$&</ul>')
                    .replace(/\n\n+/g, '<br><br>')
                    .replace(/\n/g, '<br>');

                result.innerHTML = formattedText;
            } catch (err) {
                console.error('AI comparison err:', err);
                result.innerHTML = '<div style="color:#ef4444;padding:12px 0;font-weight:600;">❌ দুঃখিত, AI তুলনা তৈরি করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।</div>';
            }
        },

        closeModal: function () {
            var modal = document.getElementById('aiCompareModal');
            if (modal) modal.classList.remove('active');
        },

        clear: function () {
            productA = null;
            productB = null;
            var dock = document.getElementById('aiCompareDock');
            if (dock) dock.classList.remove('active');
            this.closeModal();
        }
    };

    window.AiCompare = AiCompare;

    // Attach hold-click (long-press 500ms) on product cards
    document.addEventListener('DOMContentLoaded', function () {
        var pressTimer = null;

        function findProductCard(el) {
            return el.closest('a[href*="product.html"], .product-card, .product-card-hover, [data-product-id]');
        }

        function extractProductFromCard(card) {
            var href = card.getAttribute('href') || (card.querySelector('a[href*="product.html"]') ? card.querySelector('a[href*="product.html"]').getAttribute('href') : '') || '';
            var idMatch = href.match(/id=([^&]+)/);
            var id = idMatch ? decodeURIComponent(idMatch[1]) : (card.getAttribute('data-product-id') || ('prod_' + Math.random().toString(36).substring(7)));

            // 1. Try to find complete database product record from memory
            var all = window.allProducts || window.filteredProducts || window.products || window.shopProducts || [];
            if (all && all.length) {
                var found = all.find(function(p) { return String(p.id) === String(id) || String(p._id) === String(id); });
                if (found) {
                    var regular = found.base_price || found.regular_price || found.price || 0;
                    var sale = found.sale_price || (found.flash_sale_price > 0 ? (found.base_price - found.flash_sale_price) : regular);
                    var discountTxt = '';
                    if (Number(regular) > Number(sale) && Number(sale) > 0) {
                        var diff = regular - sale;
                        var pct = Math.round((diff / regular) * 100);
                        discountTxt = '৳' + diff + ' ছাড় (' + pct + '%)';
                    }

                    return {
                        id: found.id || id,
                        name: found.name || 'পণ্য',
                        regular_price: regular,
                        sale_price: sale,
                        price: '৳' + sale,
                        discount_text: discountTxt,
                        category_name: found.category_name || (found.categories && found.categories[0] ? found.categories[0].name : ''),
                        description: found.description || found.desc || '',
                        features: found.features || found.specifications || '',
                        sku: found.sku || '',
                        stock: found.stock_quantity !== undefined ? found.stock_quantity : found.stock,
                        rating: found.rating || found.reviews_avg || '',
                        image: found.image_url || (found.images && found.images[0]) || found.image || ''
                    };
                }
            }

            // 2. If currently on product.html and comparing current product
            if (window.currentProduct && String(window.currentProduct.id) === String(id)) {
                return window.currentProduct;
            }

            // 3. Fallback: Parse directly from card DOM
            var imgEl = card.querySelector('img');
            var img = imgEl ? (imgEl.currentSrc || imgEl.src) : '';
            var titleEl = card.querySelector('h3, .product-title, [class*="font-bold"], [class*="title"]');
            var title = titleEl ? titleEl.textContent.trim() : 'পণ্য';

            // Prices from DOM
            var regularEl = card.querySelector('del, s, .strike, .original-price, [class*="old-price"], [class*="regular-price"]');
            var regularVal = regularEl ? regularEl.textContent.replace(/[^0-9]/g, '') : '';

            var priceEl = card.querySelector('.price, .product-price, [class*="sale-price"], [class*="current-price"]');
            var priceText = priceEl ? priceEl.textContent.trim() : '৳0';
            var saleVal = priceText ? priceText.replace(/[^0-9]/g, '') : '';

            var discountBadgeEl = card.querySelector('[class*="discount"], [class*="badge"], [class*="off"], [class*="tag"]');
            var discountTxt = discountBadgeEl ? discountBadgeEl.textContent.trim() : '';

            var descEl = card.querySelector('.product-desc, [class*="desc"]');
            var descText = descEl ? descEl.textContent.trim() : '';

            return {
                id: id,
                name: title,
                regular_price: regularVal || saleVal,
                sale_price: saleVal || regularVal,
                price: priceText,
                discount_text: discountTxt,
                description: descText,
                image: img
            };
        }

        // Long press for touch devices
        document.addEventListener('touchstart', function (e) {
            var card = findProductCard(e.target);
            if (!card) return;

            pressTimer = setTimeout(function () {
                var prod = extractProductFromCard(card);
                AiCompare.selectProduct(prod);
            }, 550);
        }, { passive: true });

        document.addEventListener('touchend', function () { clearTimeout(pressTimer); }, { passive: true });
        document.addEventListener('touchmove', function () { clearTimeout(pressTimer); }, { passive: true });

        // Right-click enhancement for desktop: check if right-click was on product card
        document.addEventListener('contextmenu', function (e) {
            var card = findProductCard(e.target);
            if (!card) return;

            // Add or update comparison button in context menu
            var ctxMenu = document.getElementById('customContextMenu');
            if (ctxMenu) {
                var existingAiBtn = document.getElementById('ctxAiCompareBtn');
                if (!existingAiBtn) {
                    var btn = document.createElement('div');
                    btn.id = 'ctxAiCompareBtn';
                    btn.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;font-weight:600;color:#7c3aed;background:rgba(124,58,237,0.06);cursor:pointer;border-bottom:1px solid #eee;';
                    btn.innerHTML = '<span style="font-size:16px;">⚖️</span> Compare with AI';
                    btn.onclick = function () {
                        var prod = extractProductFromCard(card);
                        AiCompare.selectProduct(prod);
                        ctxMenu.style.display = 'none';
                    };
                    ctxMenu.insertBefore(btn, ctxMenu.firstChild);
                } else {
                    existingAiBtn.onclick = function () {
                        var prod = extractProductFromCard(card);
                        AiCompare.selectProduct(prod);
                        ctxMenu.style.display = 'none';
                    };
                }
            }
        });
    });

})(window);
