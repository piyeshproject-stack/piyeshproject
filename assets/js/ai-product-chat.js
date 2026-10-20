/**
 * AI Product Chat & Live Voice Call Assistant
 * Supports:
 *  - Product Question & Answer powered by Google Gemini API
 *  - Voice Call Mode (Interactive Speech Input & Audio Output)
 *  - Window Minimize to floating dock
 *  - Product Specification context injection
 */

(function (window) {
    'use strict';

    var currentProduct = null;
    var chatHistory = [];
    var isVoiceActive = false;
    var isListening = false;
    var speechRecognition = null;
    var synth = window.speechSynthesis || null;

    // Initialize DOM elements when ready
    function initAiChat() {
        if (document.getElementById('aiChatBackdrop')) return;

        var html = [
            '<div class="ai-modal-backdrop" id="aiChatBackdrop">',
            '  <div class="ai-chat-window" id="aiChatWindow">',
            '    <!-- Header -->',
            '    <div class="ai-chat-header">',
            '      <div class="ai-chat-header-info">',
            '        <div class="ai-bot-avatar">✨</div>',
            '        <div>',
            '          <div class="ai-header-title">পণ্য সহকারী AI</div>',
            '          <div class="ai-header-subtitle"><span class="ai-pulse-dot" style="display:inline-block;margin-right:2px;"></span> Online | Ask anything</div>',
            '        </div>',
            '      </div>',
            '      <div class="ai-header-actions">',
            '        <button class="ai-btn-ctrl" id="aiHeaderVoiceBtn" title="Voice Call Mode" onclick="window.ProductAiChat.toggleVoiceMode()">📞</button>',
            '        <button class="ai-btn-ctrl" title="Minimize" onclick="window.ProductAiChat.minimize()">─</button>',
            '        <button class="ai-btn-ctrl" title="Close" onclick="window.ProductAiChat.close()">✕</button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Product Context Bar -->',
            '    <div class="ai-product-bar" id="aiProductBar">',
            '      <img class="ai-product-bar-img" id="aiBarImg" src="" alt="">',
            '      <div class="ai-product-bar-details">',
            '        <div class="ai-product-bar-name" id="aiBarName">Loading product...</div>',
            '        <div class="ai-product-bar-price" id="aiBarPrice">৳0</div>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Text Chat Area -->',
            '    <div class="ai-chat-messages" id="aiChatMessages"></div>',
            '',
            '    <!-- Quick Suggested Chips -->',
            '    <div class="ai-chips-row" id="aiChipsRow">',
            '      <button class="ai-chip" onclick="window.ProductAiChat.sendChip(this.textContent)">প্রধান ফিচারগুলো কী?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ডেলিভারি চার্জ ও সময় কত?\')">ডেলিভারি সময় কত?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই প্রোডাক্টে কি কোনো অফার বা ছাড় আছে?\')">কোনো ডিসকাউন্ট আছে?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ক্যাশ অন ডেলিভারিতে অর্ডার করব কীভাবে?\')">অর্ডার প্রসেস কী?</button>',
            '    </div>',
            '',
            '    <!-- Live Voice Call Panel -->',
            '    <div class="ai-voice-panel" id="aiVoicePanel">',
            '      <div class="ai-voice-orb" id="aiVoiceOrb"></div>',
            '      <div class="ai-voice-status-title" id="aiVoiceStatusTitle">AI Voice Call Connected</div>',
            '      <div class="ai-voice-status-desc" id="aiVoiceStatusDesc">মাইক্রোফোনে কথা বলুন, পণ্য সম্পর্কে যে কোনো প্রশ্ন করুন।</div>',
            '      <div class="ai-sound-waves" id="aiSoundWaves">',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '      </div>',
            '      <div class="ai-voice-actions">',
            '        <button class="ai-btn-call-end" onclick="window.ProductAiChat.toggleVoiceMode()">',
            '          <span>🛑 End Call</span>',
            '        </button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Text Input Area -->',
            '    <div class="ai-chat-footer" id="aiChatFooter">',
            '      <div class="ai-input-wrap">',
            '        <input type="text" class="ai-input-field" id="aiInputField" placeholder="পণ্য সম্পর্কে প্রশ্ন লিখুন..." onkeypress="if(event.key===\'Enter\') window.ProductAiChat.sendCurrentInput()">',
            '        <button class="ai-btn-voice-trigger" title="Speak question" onclick="window.ProductAiChat.toggleVoiceMode()">🎤</button>',
            '        <button class="ai-btn-send" title="Send" onclick="window.ProductAiChat.sendCurrentInput()">➤</button>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>',
            '',
            '<!-- Minimized Floating Bubble -->',
            '<div class="ai-floating-bubble" id="aiFloatingBubble" onclick="window.ProductAiChat.restore()">',
            '  <span class="ai-pulse-dot"></span>',
            '  <span>✨ Ask with AI</span>',
            '</div>'
        ].join('\n');

        var div = document.createElement('div');
        div.id = 'aiProductChatRoot';
        div.innerHTML = html;
        document.body.appendChild(div);

        // Click on backdrop outside window to minimize
        var backdrop = document.getElementById('aiChatBackdrop');
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) {
                window.ProductAiChat.minimize();
            }
        });

        initSpeechRecognition();
    }

    window.ProductAiChipClick = function (txt) {
        if (window.ProductAiChat) {
            window.ProductAiChat.sendChip(txt);
        }
    };

    function initSpeechRecognition() {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            console.log('Speech recognition not supported in this browser.');
            return;
        }
        speechRecognition = new SpeechRec();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = 'bn-BD'; // Support Bengali, falls back to English

        speechRecognition.onstart = function () {
            isListening = true;
            updateVoiceOrb(true, 'কথা বলুন, শুনছি...', 'আপনার প্রশ্ন শেষ হলে AI উত্তর দেবে');
        };

        speechRecognition.onresult = function (event) {
            var transcript = event.results[0][0].transcript;
            if (transcript && transcript.trim()) {
                updateVoiceOrb(false, 'চিন্তা করছে...', 'Gemini AI আপনার প্রশ্নের উত্তর তৈরি করছে');
                handleUserQuestion(transcript.trim(), true);
            }
        };

        speechRecognition.onerror = function (event) {
            console.warn('Speech error:', event.error);
            isListening = false;
            updateVoiceOrb(false, 'শুনতে সমস্যা হয়েছে', 'আবার চেষ্টা করতে ক্লিক করুন');
        };

        speechRecognition.onend = function () {
            isListening = false;
            if (isVoiceActive) {
                // If voice call is still active, don't auto-restart immediately to prevent echo
            }
        };
    }

    function updateVoiceOrb(listening, title, desc) {
        var orb = document.getElementById('aiVoiceOrb');
        var waves = document.getElementById('aiSoundWaves');
        var titleEl = document.getElementById('aiVoiceStatusTitle');
        var descEl = document.getElementById('aiVoiceStatusDesc');

        if (orb) orb.classList.toggle('listening', listening);
        if (waves) waves.classList.toggle('active', listening);
        if (titleEl && title) titleEl.textContent = title;
        if (descEl && desc) descEl.textContent = desc;
    }

    function speakText(text) {
        if (!synth) return;
        synth.cancel(); // Cancel any ongoing speech

        var utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a Bengali or English voice
        var voices = synth.getVoices();
        var bnVoice = voices.find(function(v){ return v.lang && v.lang.startsWith('bn'); });
        if (bnVoice) utterance.voice = bnVoice;

        utterance.onstart = function() {
            updateVoiceOrb(true, 'AI কথা বলছে...', 'শুনুন...');
        };

        utterance.onend = function() {
            if (isVoiceActive) {
                updateVoiceOrb(false, 'কথা বলুন, শুনছি...', 'আপনার পরবর্তী প্রশ্ন করুন');
                setTimeout(startListening, 500);
            }
        };

        synth.speak(utterance);
    }

    function startListening() {
        if (!speechRecognition || isListening) return;
        try {
            speechRecognition.start();
        } catch (e) {
            console.warn('Recognition start error', e);
        }
    }

    // Read product info from page or parameter
    function resolveProductInfo(passed) {
        if (passed) return passed;

        var name = (document.getElementById('pName') ? document.getElementById('pName').textContent.trim() : '') || 'পণ্য';
        var price = (document.getElementById('currentPrice') ? document.getElementById('currentPrice').textContent.trim() : '') || '৳0';
        var sku = (document.getElementById('pSkuVal') ? document.getElementById('pSkuVal').textContent.trim() : '');
        var desc = (document.getElementById('pDesc') ? document.getElementById('pDesc').innerText.trim() : '');
        var imgEl = document.getElementById('mainImg');
        var img = imgEl ? imgEl.src : '';

        return {
            name: name,
            price: price,
            sku: sku,
            description: desc,
            image: img
        };
    }

    function appendMessage(role, text) {
        var container = document.getElementById('aiChatMessages');
        if (!container) return;

        var msgDiv = document.createElement('div');
        msgDiv.className = 'ai-message ' + (role === 'user' ? 'user' : 'bot');

        var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = [
            '<div class="ai-bubble">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>',
            '<div class="ai-msg-time">' + timeStr + '</div>'
        ].join('');

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;

        chatHistory.push({ role: role, content: text });
    }

    function showTypingIndicator() {
        var container = document.getElementById('aiChatMessages');
        if (!container) return null;

        var id = 'aiTyping_' + Date.now();
        var div = document.createElement('div');
        div.id = id;
        div.className = 'ai-message bot';
        div.innerHTML = [
            '<div class="ai-typing-indicator">',
            '  <span class="ai-dot"></span>',
            '  <span class="ai-dot"></span>',
            '  <span class="ai-dot"></span>',
            '</div>'
        ].join('');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        if (!id) return;
        var el = document.getElementById(id);
        if (el) el.remove();
    }

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Build the system prompt with rich product context
    function buildSystemPrompt(prod) {
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');
        return [
            'You are an intelligent, friendly, and helpful product assistant for ' + storeName + ' in Bangladesh.',
            'You are helping a customer who is currently looking at this product:',
            '----------------------------------------',
            'Product Name: ' + (prod.name || 'N/A'),
            'Price: ' + (prod.price || 'N/A'),
            'SKU: ' + (prod.sku || 'N/A'),
            'Product Details: ' + (prod.description ? prod.description.substring(0, 1500) : 'High quality item'),
            'Cash on Delivery: Available across Bangladesh.',
            'Store Policy: 100% Genuine product with return and replacement support.',
            '----------------------------------------',
            'Instructions:',
            '1. Answer the customer concisely, accurately, and politely.',
            '2. Always match the customer language: if they ask in Bengali, respond in fluent Bengali. If they ask in English, respond in English.',
            '3. Highlight the benefits and specifications of this product.',
            '4. Keep answers brief (2-4 sentences max per response) so it is easy to read on mobile and fast for voice audio.',
            '5. Encourage the customer if they are ready to order by clicking "Add to Cart" or "Buy Now".'
        ].join('\n');
    }

    async function handleUserQuestion(question, fromVoice) {
        if (!question || !question.trim()) return;
        question = question.trim();

        appendMessage('user', question);

        var typingId = showTypingIndicator();

        try {
            var systemPrompt = buildSystemPrompt(currentProduct);

            var res = await window.AIConfig.generateText({
                prompt: question,
                systemInstruction: systemPrompt,
                history: chatHistory.slice(-6) // send last 6 messages
            });

            removeTypingIndicator(typingId);

            var answer = res.text || 'ধন্যবাদ আপনার প্রশ্নের জন্য। এই পণ্যটি সম্পর্কে আরও কোনো তথ্য জানতে চান?';
            appendMessage('assistant', answer);

            if (fromVoice || isVoiceActive) {
                speakText(answer);
            }
        } catch (err) {
            removeTypingIndicator(typingId);
            var errText = 'দুঃখিত! ' + (err.message || 'AI উত্তর দিতে পারেনি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
            appendMessage('assistant', errText);
            if (fromVoice || isVoiceActive) {
                speakText(errText);
            }
        }
    }

    var ProductAiChat = {
        open: function (productObj) {
            initAiChat();
            currentProduct = resolveProductInfo(productObj);

            // Update UI product header
            var barImg = document.getElementById('aiBarImg');
            var barName = document.getElementById('aiBarName');
            var barPrice = document.getElementById('aiBarPrice');

            if (barImg) {
                if (currentProduct.image) {
                    barImg.src = currentProduct.image;
                    barImg.style.display = 'block';
                } else {
                    barImg.style.display = 'none';
                }
            }
            if (barName) barName.textContent = currentProduct.name;
            if (barPrice) barPrice.textContent = currentProduct.price;

            // Reset chat history if empty
            var container = document.getElementById('aiChatMessages');
            if (container && !chatHistory.length) {
                container.innerHTML = '';
                var greeting = 'হ্যালো! আমি আপনার স্মার্ট শপিং অ্যাসিস্ট্যান্ট। "' + (currentProduct.name || 'এই পণ্যটি') + '" সম্পর্কে যে কোনো প্রশ্ন করতে পারেন। কিভাবে সাহায্য করতে পারি?';
                appendMessage('assistant', greeting);
            }

            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.add('active');

            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');

            var input = document.getElementById('aiInputField');
            if (input) setTimeout(function () { input.focus(); }, 300);
        },

        close: function () {
            if (isVoiceActive) this.toggleVoiceMode();
            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.remove('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');
        },

        minimize: function () {
            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.remove('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.add('show');
        },

        restore: function () {
            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.add('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');
        },

        sendCurrentInput: function () {
            var input = document.getElementById('aiInputField');
            if (!input) return;
            var val = input.value;
            input.value = '';
            handleUserQuestion(val, false);
        },

        sendChip: function (chipText) {
            handleUserQuestion(chipText, false);
        },

        toggleVoiceMode: function () {
            isVoiceActive = !isVoiceActive;

            var voicePanel = document.getElementById('aiVoicePanel');
            var messages = document.getElementById('aiChatMessages');
            var footer = document.getElementById('aiChatFooter');
            var chips = document.getElementById('aiChipsRow');
            var headerBtn = document.getElementById('aiHeaderVoiceBtn');

            if (isVoiceActive) {
                if (voicePanel) voicePanel.classList.add('active');
                if (messages) messages.style.display = 'none';
                if (footer) footer.style.display = 'none';
                if (chips) chips.style.display = 'none';
                if (headerBtn) headerBtn.textContent = '💬';

                updateVoiceOrb(false, 'AI Voice Call Connected', 'মাইক্রোফোনে কথা বলুন, যে কোনো প্রশ্ন করুন');
                setTimeout(startListening, 600);
            } else {
                if (synth) synth.cancel();
                if (speechRecognition) {
                    try { speechRecognition.stop(); } catch(e){}
                }
                if (voicePanel) voicePanel.classList.remove('active');
                if (messages) messages.style.display = 'flex';
                if (footer) footer.style.display = 'block';
                if (chips) chips.style.display = 'flex';
                if (headerBtn) headerBtn.textContent = '📞';
            }
        }
    };

    window.ProductAiChat = ProductAiChat;
    window.openProductAiChat = function (prod) {
        ProductAiChat.open(prod);
    };

})(window);
