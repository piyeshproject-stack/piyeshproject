/**
 * AI Product Comparison Feature
 * Hold-Click (Long Press) / Right-Click to compare 2 products
 * Detailed side-by-side comparison powered by Google Gemini API
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
            '        <div style="font-size:12px;color:#64748b;">Powered by Google Gemini Live Analysis</div>',
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
            '        <span style="font-size:13px;color:#64748b;">AI দুটি পণ্যের ডেটা অ্যানালাইজ করছে...</span>',
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

    var AiCompare = {
        selectProduct: function (prod) {
            initCompareUI();

            if (!productA) {
                productA = prod;
                this.updateDock();
                if (typeof showToast === 'function') {
                    showToast('⚖️ 1st product selected! Now hold-click another product to compare.', 'info');
                }
            } else if (!productB && (String(productA.id) !== String(prod.id))) {
                productB = prod;
                this.updateDock();
                this.openModal();
            } else if (String(productA.id) === String(prod.id)) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Please select a different 2nd product to compare', 'warning');
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

            cards.innerHTML = [
                '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;background:#fff;">',
                '  <img src="' + (productA.image || '') + '" style="width:100%;height:140px;object-fit:contain;border-radius:8px;margin-bottom:8px;">',
                '  <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px;" class="line-clamp-2">' + productA.name + '</div>',
                '  <div style="font-weight:800;font-size:15px;color:var(--ai-primary);margin-bottom:8px;">' + (productA.price || '৳0') + '</div>',
                '  <a href="product.html?id=' + (productA.id || '') + '" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;">View Product</a>',
                '</div>',
                '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;background:#fff;">',
                '  <img src="' + (productB.image || '') + '" style="width:100%;height:140px;object-fit:contain;border-radius:8px;margin-bottom:8px;">',
                '  <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px;" class="line-clamp-2">' + productB.name + '</div>',
                '  <div style="font-weight:800;font-size:15px;color:var(--ai-primary);margin-bottom:8px;">' + (productB.price || '৳0') + '</div>',
                '  <a href="product.html?id=' + (productB.id || '') + '" class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 10px;">View Product</a>',
                '</div>'
            ].join('\n');

            result.innerHTML = [
                '<div style="display:flex;align-items:center;gap:10px;padding:24px 0;justify-content:center;">',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span class="ai-dot" style="background:#7c3aed;"></span>',
                '  <span style="font-size:13px;color:#64748b;">AI তুলনা তৈরি করছে...</span>',
                '</div>'
            ].join('\n');

            modal.classList.add('active');

            try {
                var prompt = [
                    'Compare these two products objectively for an e-commerce customer in Bangladesh:',
                    'Product A: ' + productA.name + ' (Price: ' + productA.price + ')',
                    'Product B: ' + productB.name + ' (Price: ' + productB.price + ')',
                    '',
                    'Please format your response clearly in Bengali with bullet points:',
                    '1. প্রধান পার্থক্যের তুলনা (Key Differences)',
                    '2. মূল্য ও উপযোগিতা (Price & Value for money)',
                    '3. কার জন্য কোনটি বেশি উপযোগী (Who should buy which)',
                    '4. 🏆 চূড়ান্ত রায় (AI Verdict)'
                ].join('\n');

                var res = await window.AIConfig.generateText({
                    model: 'gemini-3.5-flash',
                    prompt: prompt,
                    systemInstruction: 'You are an expert e-commerce product comparison analyst. Provide structured, fair, and easy to read comparison in Bengali.'
                });

                var formattedText = (res.text || 'তুলনা সম্পন্ন হয়েছে।')
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
                    .replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin:6px 0;padding-left:18px;">$&</ul>')
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
            return el.closest('a[href*="product.html"], .product-card, .product-card-hover');
        }

        function extractProductFromCard(card) {
            var href = card.getAttribute('href') || '';
            var idMatch = href.match(/id=([^&]+)/);
            var id = idMatch ? decodeURIComponent(idMatch[1]) : ('prod_' + Math.random().toString(36).substring(7));
            var imgEl = card.querySelector('img');
            var img = imgEl ? imgEl.src : '';
            var titleEl = card.querySelector('h3, .product-title, [class*="font-bold"]');
            var title = titleEl ? titleEl.textContent.trim() : 'পণ্য';
            var priceEl = card.querySelector('.price, .product-price, [class*="price"]');
            var price = priceEl ? priceEl.textContent.trim() : '৳0';

            return { id: id, name: title, price: price, image: img };
        }

        // Long press for touch devices
        document.addEventListener('touchstart', function (e) {
            var card = findProductCard(e.target);
            if (!card) return;

            pressTimer = setTimeout(function () {
                var prod = extractProductFromCard(card);
                AiCompare.selectProduct(prod);
            }, 600);
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
