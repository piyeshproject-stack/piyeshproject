/**
 * AI Product Chat & Live Voice Call Assistant
 * v3.8.4 — Instant streaming, live voice call with proper mic permission & speech synthesis
 */

(function (window) {
    'use strict';

    var currentProduct     = null;
    var chatHistory        = [];
    var isVoiceActive      = false;
    var isListening        = false;
    var speechRecognition  = null;
    var synth              = window.speechSynthesis || null;
    var isSpeaking         = false;
    var hasGreetedInCall   = false;

    // ─── Build Chat UI DOM ─────────────────────────────────────────
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
            '          <div class="ai-header-subtitle"><span class="ai-pulse-dot" style="display:inline-block;margin-right:2px;"></span> Online | Ultra-Fast AI</div>',
            '        </div>',
            '      </div>',
            '      <div class="ai-header-actions">',
            '        <button class="ai-btn-ctrl" id="aiHeaderVoiceBtn" title="ভয়েস কল মোড" onclick="window.ProductAiChat.toggleVoiceMode()">📞</button>',
            '        <button class="ai-btn-ctrl" title="ছোট করুন" onclick="window.ProductAiChat.minimize()">─</button>',
            '        <button class="ai-btn-ctrl" title="বন্ধ করুন" onclick="window.ProductAiChat.close()">✕</button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Product Context Bar -->',
            '    <div class="ai-product-bar" id="aiProductBar">',
            '      <img class="ai-product-bar-img" id="aiBarImg" src="" alt="">',
            '      <div class="ai-product-bar-details">',
            '        <div class="ai-product-bar-name" id="aiBarName">পণ্য লোড হচ্ছে...</div>',
            '        <div class="ai-product-bar-price" id="aiBarPrice">৳0</div>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Text Chat Messages -->',
            '    <div class="ai-chat-messages" id="aiChatMessages"></div>',
            '',
            '    <!-- Suggested Quick Chips -->',
            '    <div class="ai-chips-row" id="aiChipsRow">',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই পণ্যের প্রধান ফিচারগুলো কী?\')">প্রধান ফিচারগুলো কী?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ডেলিভারি চার্জ ও সময় কত লাগবে?\')">ডেলিভারি সময় কত?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই প্রোডাক্টে কি কোনো বিশেষ ডিসকাউন্ট বা অফার আছে?\')">কোনো ডিসকাউন্ট আছে?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ক্যাশ অন ডেলিভারিতে অর্ডার করার নিয়ম কী?\')">অর্ডার প্রসেস কী?</button>',
            '    </div>',
            '',
            '    <!-- Live Voice Call Panel -->',
            '    <div class="ai-voice-panel" id="aiVoicePanel">',
            '      <div class="ai-voice-orb" id="aiVoiceOrb"></div>',
            '      <div class="ai-voice-status-title" id="aiVoiceStatusTitle">AI Voice Call</div>',
            '      <div class="ai-voice-status-desc" id="aiVoiceStatusDesc">ভয়েস কল কানেক্ট হচ্ছে...</div>',
            '      <div class="ai-sound-waves" id="aiSoundWaves">',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '        <div class="ai-wave-bar"></div>',
            '      </div>',
            '      <div class="ai-voice-actions">',
            '        <button class="ai-btn-call-end" onclick="window.ProductAiChat.toggleVoiceMode()">',
            '          <span>🛑 কল শেষ করুন</span>',
            '        </button>',
            '        <button class="btn btn-sm btn-ghost" id="aiVoiceRetryBtn" style="display:none;color:#fff;border:1px solid rgba(255,255,255,0.3);margin-left:8px;" onclick="window.ProductAiChat.startVoiceCallSession()">',
            '          🔄 আবার চেষ্টা করুন',
            '        </button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Input Bar -->',
            '    <div class="ai-chat-footer" id="aiChatFooter">',
            '      <div class="ai-input-wrap">',
            '        <input type="text" class="ai-input-field" id="aiInputField" placeholder="পণ্য সম্পর্কে প্রশ্ন লিখুন..." onkeypress="if(event.key===\'Enter\') window.ProductAiChat.sendCurrentInput()">',
            '        <button class="ai-btn-voice-trigger" title="মুখে বলে প্রশ্ন করুন" onclick="window.ProductAiChat.toggleInputDictation()" id="aiDictateBtn">🎤</button>',
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

        document.getElementById('aiChatBackdrop').addEventListener('click', function (e) {
            if (e.target === this) window.ProductAiChat.minimize();
        });
    }

    window.ProductAiChipClick = function (txt) {
        if (window.ProductAiChat) window.ProductAiChat.sendChip(txt);
    };

    // ─── Voice / Microphone Permission & Speech Recognition ────────
    async function requestMicPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { supported: false, error: 'Browser does not support getUserMedia' };
        }
        try {
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            // CRITICAL FIX: Stop all tracks immediately so the microphone is NOT locked when SpeechRecognition starts!
            stream.getTracks().forEach(function (track) { track.stop(); });
            return { supported: true, granted: true };
        } catch (err) {
            console.warn('Microphone permission request failed:', err);
            return { supported: true, granted: false, error: err.name || err.message };
        }
    }

    function initSpeechRecognition() {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            return null;
        }

        var rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'bn-BD'; // Bengali priority, handles mixed English naturally

        rec.onstart = function () {
            isListening = true;
            updateVoiceOrb(true, 'শুনছি... আপনার প্রশ্ন বলুন', 'কথা বলা শেষ হলে AI সাথে সাথে উত্তর দেবে');
            var dictBtn = document.getElementById('aiDictateBtn');
            if (dictBtn) dictBtn.classList.add('recording');
        };

        rec.onresult = function (event) {
            isListening = false;
            var transcript = '';
            if (event.results && event.results[0] && event.results[0][0]) {
                transcript = event.results[0][0].transcript;
            }
            if (transcript && transcript.trim()) {
                var cleanText = transcript.trim();
                var dictBtn = document.getElementById('aiDictateBtn');
                if (dictBtn) dictBtn.classList.remove('recording');

                if (isVoiceActive) {
                    updateVoiceOrb(false, 'চিন্তা করছে...', 'Gemini AI উত্তর তৈরি করছে');
                    handleUserQuestion(cleanText, true);
                } else {
                    var input = document.getElementById('aiInputField');
                    if (input) input.value = cleanText;
                    handleUserQuestion(cleanText, false);
                }
            }
        };

        rec.onerror = function (event) {
            console.warn('SpeechRecognition error:', event.error);
            isListening = false;
            var dictBtn = document.getElementById('aiDictateBtn');
            if (dictBtn) dictBtn.classList.remove('recording');

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                updateVoiceOrb(false, 'মাইক্রোফোনের অনুমতি প্রয়োজন', 'ব্রাউজার সেটিং থেকে মাইক অ্যাকসেস এলাউ (Allow) করুন।');
                var retryBtn = document.getElementById('aiVoiceRetryBtn');
                if (retryBtn) retryBtn.style.display = 'inline-block';
            } else if (event.error === 'no-speech') {
                if (isVoiceActive && !isSpeaking) {
                    updateVoiceOrb(false, 'শুনতে পাইনি, আবার বলুন', 'মাইক্রোফোনে কথা বলুন');
                    setTimeout(function () { if (isVoiceActive && !isSpeaking) startListening(); }, 1000);
                }
            } else {
                updateVoiceOrb(false, 'আবার বলুন', 'মাইক্রোফোনে আবার কথা বলুন');
            }
        };

        rec.onend = function () {
            isListening = false;
            var dictBtn = document.getElementById('aiDictateBtn');
            if (dictBtn) dictBtn.classList.remove('recording');
        };

        return rec;
    }

    function startListening() {
        if (isSpeaking) return;
        if (!speechRecognition) {
            speechRecognition = initSpeechRecognition();
        }
        if (!speechRecognition) {
            updateVoiceOrb(false, 'ভয়েস সাপোর্ট নেই', 'আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট নেই। Chrome বা Edge ব্যবহার করুন।');
            return;
        }
        if (isListening) return;

        try {
            speechRecognition.start();
        } catch (e) {
            console.warn('Recognition start caught error:', e);
            // If already started, re-instantiate
            speechRecognition = initSpeechRecognition();
            try { speechRecognition.start(); } catch (err2) {}
        }
    }

    function stopListening() {
        if (speechRecognition && isListening) {
            try { speechRecognition.stop(); } catch (e) {}
        }
        isListening = false;
    }

    function updateVoiceOrb(listening, title, desc) {
        var orb     = document.getElementById('aiVoiceOrb');
        var waves   = document.getElementById('aiSoundWaves');
        var titleEl = document.getElementById('aiVoiceStatusTitle');
        var descEl  = document.getElementById('aiVoiceStatusDesc');

        if (orb)   orb.classList.toggle('listening', listening);
        if (waves) waves.classList.toggle('active', listening);
        if (titleEl && title) titleEl.textContent = title;
        if (descEl  && desc)  descEl.textContent  = desc;
    }

    // ─── Text-to-Speech (Speaking AI Response) ───────────────────────
    function speakText(text) {
        if (!synth) return;
        try { synth.cancel(); } catch (e) {}

        // Strip HTML, markdown formatting, emojis for clean speech
        var clean = (text || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[*_#`~]/g, '')
            .replace(/৳\s*([0-9,]+)/g, '$1 টাকা')
            .replace(/https?:\/\/\S+/g, '')
            .trim();

        if (!clean) return;

        var utt = new SpeechSynthesisUtterance(clean);
        utt.rate  = 1.05;
        utt.pitch = 1.0;

        var voices = synth.getVoices ? synth.getVoices() : [];
        var bnVoice = voices.find(function (v) { return v.lang && (v.lang.startsWith('bn') || v.lang.includes('Bengali')); });
        if (bnVoice) utt.voice = bnVoice;

        utt.onstart = function () {
            isSpeaking = true;
            stopListening();
            updateVoiceOrb(true, 'AI কথা বলছে...', 'শুনুন...');
        };

        utt.onend = function () {
            isSpeaking = false;
            if (isVoiceActive) {
                updateVoiceOrb(false, 'কথা বলুন, শুনছি...', 'আপনার পরবর্তী প্রশ্ন করুন');
                setTimeout(function () {
                    if (isVoiceActive && !isSpeaking) startListening();
                }, 600);
            }
        };

        utt.onerror = function (e) {
            isSpeaking = false;
            console.warn('SpeechSynthesis error:', e);
            if (isVoiceActive) {
                setTimeout(function () {
                    if (isVoiceActive && !isSpeaking) startListening();
                }, 600);
            }
        };

        synth.speak(utt);
    }

    // ─── Product Context ───────────────────────────────────────────
    function resolveProductInfo(passed) {
        if (passed) return passed;
        var pNameEl = document.getElementById('pName');
        var priceEl = document.getElementById('currentPrice');
        var skuEl   = document.getElementById('pSkuVal');
        var descEl  = document.getElementById('pDesc') || document.getElementById('pDescContent');
        var imgEl   = document.getElementById('mainImg');

        return {
            name:  (pNameEl ? pNameEl.textContent.trim() : '') || 'পণ্য',
            price: (priceEl ? priceEl.textContent.trim() : '') || '৳0',
            sku:   (skuEl   ? skuEl.textContent.trim()   : ''),
            description: (descEl ? descEl.innerText.trim().slice(0, 500) : ''),
            image: imgEl ? imgEl.src : ''
        };
    }

    // ─── Format Bot Response ───────────────────────────────────────
    function formatBotText(text) {
        if (!text) return '';
        var t = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            .replace(/৳\s*([0-9,]+)/g, '<span class="ai-price-tag">৳$1</span>')
            .replace(/\n\n+/g, '<br><br>')
            .replace(/\n/g, '<br>');
        return t;
    }

    function appendMessage(role, text) {
        var container = document.getElementById('aiChatMessages');
        if (!container) return;

        var msgDiv = document.createElement('div');
        msgDiv.className = 'ai-message ' + (role === 'user' ? 'user' : 'bot');
        var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (role === 'user') {
            msgDiv.innerHTML = '<div class="ai-bubble">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div><div class="ai-msg-time">' + timeStr + '</div>';
        } else {
            msgDiv.innerHTML = '<div class="ai-bubble">' + formatBotText(text) + '</div><div class="ai-msg-time">' + timeStr + '</div>';
        }

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        chatHistory.push({ role: role, content: text });
    }

    function createStreamingBubble() {
        var container = document.getElementById('aiChatMessages');
        if (!container) return null;
        var id = 'aiStream_' + Date.now();
        var div = document.createElement('div');
        div.id = id;
        div.className = 'ai-message bot';
        var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = '<div class="ai-bubble ai-bubble-streaming" id="' + id + '_inner"><span class="ai-pulse-dot" style="display:inline-block;margin-right:4px;"></span> লিখছে...</div><div class="ai-msg-time">' + timeStr + '</div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    function updateStreamingBubble(id, fullText) {
        var inner = document.getElementById(id + '_inner');
        if (inner) {
            inner.innerHTML = formatBotText(fullText) + '<span class="ai-cursor-pulse">|</span>';
            var container = document.getElementById('aiChatMessages');
            if (container) container.scrollTop = container.scrollHeight;
        }
    }

    function finalizeStreamingBubble(id, fullText) {
        var inner = document.getElementById(id + '_inner');
        if (inner) {
            inner.innerHTML = formatBotText(fullText);
            inner.classList.remove('ai-bubble-streaming');
        }
        chatHistory.push({ role: 'assistant', content: fullText });
    }

    function showTypingIndicator() {
        var container = document.getElementById('aiChatMessages');
        if (!container) return null;
        var id = 'aiTyping_' + Date.now();
        var div = document.createElement('div');
        div.id = id;
        div.className = 'ai-message bot';
        div.innerHTML = '<div class="ai-bubble ai-bubble-typing"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    function removeElement(id) {
        if (!id) return;
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ─── Query Handling with Streaming ─────────────────────────────
    async function handleUserQuestion(question, fromVoice) {
        appendMessage('user', question);

        var p = currentProduct || resolveProductInfo();
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');

        var systemPrompt = [
            'You are a helpful, courteous, and high-converting e-commerce shopping assistant for "' + storeName + '".',
            'Currently viewing product: "' + p.name + '", Price: ' + p.price + (p.sku ? (', SKU: ' + p.sku) : '') + '.',
            p.description ? ('Product details: ' + p.description) : '',
            'Respond in Bengali (বাংলা) by default (or the language of user inquiry).',
            'Be concise, friendly, persuasive, and helpful. Mention cash on delivery and delivery guarantee where helpful.',
            'Keep answers brief for fast reading (2-4 sentences max unless detailed info is requested).'
        ].filter(Boolean).join('\n');

        // Streaming with AIConfig.streamText (1s first-token latency)
        if (window.AIConfig && typeof window.AIConfig.streamText === 'function') {
            var streamId = createStreamingBubble();
            try {
                var res = await window.AIConfig.streamText({
                    prompt: question,
                    systemInstruction: systemPrompt,
                    history: chatHistory.slice(-6),
                    isVoice: fromVoice || isVoiceActive
                }, function (chunk, currentFull) {
                    updateStreamingBubble(streamId, currentFull);
                });

                finalizeStreamingBubble(streamId, res.text);
                if (fromVoice || isVoiceActive) speakText(res.text);
                return;
            } catch (err) {
                removeElement(streamId);
                var errText = 'দুঃখিত! ' + (err.message || 'AI উত্তর দিতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।');
                appendMessage('assistant', errText);
                if (fromVoice || isVoiceActive) speakText(errText);
                return;
            }
        }

        // Fallback to non-streaming generateText
        var typingId = showTypingIndicator();
        try {
            var res2 = await window.AIConfig.generateText({
                prompt: question,
                systemInstruction: systemPrompt,
                history: chatHistory.slice(-6),
                isVoice: fromVoice || isVoiceActive
            });
            removeElement(typingId);
            var ans = res2.text || 'ধন্যবাদ।';
            appendMessage('assistant', ans);
            if (fromVoice || isVoiceActive) speakText(ans);
        } catch (err2) {
            removeElement(typingId);
            var errText2 = 'দুঃখিত! ' + (err2.message || 'AI উত্তর দিতে পারেনি।');
            appendMessage('assistant', errText2);
            if (fromVoice || isVoiceActive) speakText(errText2);
        }
    }

    // ─── Public API ───────────────────────────────────────────────
    var ProductAiChat = {
        open: function (productObj) {
            initAiChat();
            currentProduct = resolveProductInfo(productObj);

            var barImg   = document.getElementById('aiBarImg');
            var barName  = document.getElementById('aiBarName');
            var barPrice = document.getElementById('aiBarPrice');

            if (barImg) {
                if (currentProduct.image) {
                    barImg.src = currentProduct.image;
                    barImg.style.display = 'block';
                } else {
                    barImg.style.display = 'none';
                }
            }
            if (barName)  barName.textContent  = currentProduct.name;
            if (barPrice) barPrice.textContent = currentProduct.price;

            var container = document.getElementById('aiChatMessages');
            if (container && !chatHistory.length) {
                container.innerHTML = '';
                appendMessage('assistant', 'হ্যালো! আমি আপনার স্মার্ট শপিং অ্যাসিস্ট্যান্ট। "' + (currentProduct.name || 'এই পণ্যটি') + '" সম্পর্কে যেকোনো প্রশ্ন করতে পারেন। কিভাবে সাহায্য করতে পারি?');
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
            stopListening();
            if (synth) synth.cancel();
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
            var val = input.value.trim();
            if (!val) return;
            input.value = '';
            handleUserQuestion(val, false);
        },

        sendChip: function (chipText) {
            handleUserQuestion(chipText, false);
        },

        toggleInputDictation: async function () {
            if (isListening) {
                stopListening();
                return;
            }
            var micCheck = await requestMicPermission();
            if (!micCheck.granted) {
                alert('মাইক্রোফোনের অনুমতি দিন যাতে মুখে বলে টাইপ করতে পারেন।');
                return;
            }
            startListening();
        },

        startVoiceCallSession: async function () {
            var retryBtn = document.getElementById('aiVoiceRetryBtn');
            if (retryBtn) retryBtn.style.display = 'none';

            updateVoiceOrb(false, 'মাইক্রোফোন অনুমতি চাওয়া হচ্ছে...', 'ব্রাউজারে Allow বাটনে ক্লিক করুন');

            var micCheck = await requestMicPermission();
            if (!micCheck.granted) {
                updateVoiceOrb(false, 'মাইক্রোফোনের অনুমতি দিন', 'ব্রাউজারে মাইক্রোফোনের অনুমতি (Allow) দিন, তারপর আবার চেষ্টা করুন।');
                if (retryBtn) retryBtn.style.display = 'inline-block';
                return;
            }

            updateVoiceOrb(false, 'AI কল কানেক্টেড!', 'হ্যালো! শুনছি, বলুন...');

            // Friendly AI greeting on call start
            if (!hasGreetedInCall) {
                hasGreetedInCall = true;
                var greet = 'হ্যালো! আমি আপনার শপিং অ্যাসিস্ট্যান্ট। ' + (currentProduct ? currentProduct.name : 'এই পণ্যটি') + ' সম্পর্কে আপনার কী প্রশ্ন আছে, বলুন?';
                speakText(greet);
            } else {
                updateVoiceOrb(true, 'শুনছি... আপনার প্রশ্ন বলুন', 'কথা বলুন');
                startListening();
            }
        },

        toggleVoiceMode: function () {
            isVoiceActive = !isVoiceActive;

            var voicePanel = document.getElementById('aiVoicePanel');
            var messages   = document.getElementById('aiChatMessages');
            var footer     = document.getElementById('aiChatFooter');
            var chips      = document.getElementById('aiChipsRow');
            var headerBtn  = document.getElementById('aiHeaderVoiceBtn');

            if (isVoiceActive) {
                if (voicePanel) voicePanel.classList.add('active');
                if (messages)  messages.style.display = 'none';
                if (footer)    footer.style.display   = 'none';
                if (chips)     chips.style.display     = 'none';
                if (headerBtn) headerBtn.textContent   = '💬';

                this.startVoiceCallSession();
            } else {
                if (synth) synth.cancel();
                stopListening();
                isSpeaking = false;
                hasGreetedInCall = false;

                if (voicePanel) voicePanel.classList.remove('active');
                if (messages)  messages.style.display = 'flex';
                if (footer)    footer.style.display   = 'block';
                if (chips)     chips.style.display     = 'flex';
                if (headerBtn) headerBtn.textContent   = '📞';
            }
        }
    };

    window.ProductAiChat = ProductAiChat;
    window.openProductAiChat = function (prod) { ProductAiChat.open(prod); };

})(window);
