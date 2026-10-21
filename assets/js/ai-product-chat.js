/**
 * AI Product Chat Assistant
 * Gemini 3.8 Live Engine (WebSocket BidiGenerateContent)
 * Shows text in chat bubble with an interactive "🔊 শুনুন" (Listen) button to play the 24kHz PCM audio reply.
 */

(function (window) {
    'use strict';

    var currentProduct     = null;
    var chatHistory        = [];
    var isDictating        = false;
    var dictationRec       = null;

    // Audio Playback Manager for 24kHz 16-bit PCM returned by Gemini Live
    var audioCtx           = null;
    var activeAudioSource  = null;
    var activeAudioBtn     = null;
    var audioChunksStore   = {}; // map of msgId -> array of base64 chunks

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
            '          <div class="ai-header-subtitle"><span class="ai-pulse-dot" style="display:inline-block;margin-right:2px;"></span> Online | Gemini 3.8 Live</div>',
            '        </div>',
            '      </div>',
            '      <div class="ai-header-actions">',
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
            '    <!-- Input Bar -->',
            '    <div class="ai-chat-footer" id="aiChatFooter">',
            '      <div class="ai-input-wrap">',
            '        <input type="text" class="ai-input-field" id="aiInputField" placeholder="পণ্য সম্পর্কে প্রশ্ন লিখুন..." onkeypress="if(event.key===\'Enter\') window.ProductAiChat.sendCurrentInput()">',
            '        <button class="ai-btn-voice-trigger" title="মুখে বলে টাইপ করুন" onclick="window.ProductAiChat.toggleInputDictation()" id="aiDictateBtn">🎤</button>',
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

    // ─── Play 24kHz 16-bit PCM Audio Chunks ─────────────────────────
    function playPcmAudio(chunks, msgId, btnEl) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            alert('আপনার ব্রাউজারে অডিও প্লেয়ার সাপোর্ট নেই।');
            return;
        }

        // If currently playing, stop it
        if (activeAudioSource) {
            try { activeAudioSource.stop(); } catch (e) {}
            activeAudioSource = null;
            if (activeAudioBtn) {
                activeAudioBtn.classList.remove('playing');
                activeAudioBtn.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
            }
            if (activeAudioBtn === btnEl) {
                activeAudioBtn = null;
                return;
            }
        }

        if (!audioCtx) {
            audioCtx = new AudioCtx({ sampleRate: 24000 });
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // If chunks empty, fallback to SpeechSynthesis
        if (!chunks || !chunks.length) {
            var msgText = (document.getElementById(msgId + '_text') ? document.getElementById(msgId + '_text').innerText : '');
            if (msgText && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                var utt = new SpeechSynthesisUtterance(msgText);
                utt.rate = 1.05;
                if (btnEl) {
                    btnEl.classList.add('playing');
                    btnEl.innerHTML = '<span>⏹️</span> <span>থামান</span>';
                    activeAudioBtn = btnEl;
                }
                utt.onend = function () {
                    if (btnEl) {
                        btnEl.classList.remove('playing');
                        btnEl.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
                        activeAudioBtn = null;
                    }
                };
                window.speechSynthesis.speak(utt);
            }
            return;
        }

        // Decode PCM
        var totalLength = 0;
        var buffers = [];
        for (var i = 0; i < chunks.length; i++) {
            var binStr = atob(chunks[i]);
            var len = binStr.length;
            var int16 = new Int16Array(len / 2);
            for (var j = 0; j < len; j += 2) {
                int16[j / 2] = binStr.charCodeAt(j) | (binStr.charCodeAt(j + 1) << 8);
            }
            var float32 = new Float32Array(int16.length);
            for (var k = 0; k < int16.length; k++) {
                float32[k] = int16[k] / 32768;
            }
            buffers.push(float32);
            totalLength += float32.length;
        }

        if (totalLength === 0) return;

        var audioBuffer = audioCtx.createBuffer(1, totalLength, 24000);
        var channel = audioBuffer.getChannelData(0);
        var offset = 0;
        for (var b = 0; b < buffers.length; b++) {
            channel.set(buffers[b], offset);
            offset += buffers[b].length;
        }

        var source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        activeAudioSource = source;
        activeAudioBtn = btnEl;

        if (btnEl) {
            btnEl.classList.add('playing');
            btnEl.innerHTML = '<span>⏹️</span> <span>থামান</span>';
        }

        source.onended = function () {
            if (activeAudioSource === source) {
                activeAudioSource = null;
                if (btnEl) {
                    btnEl.classList.remove('playing');
                    btnEl.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
                }
                activeAudioBtn = null;
            }
        };

        source.start(0);
    }

    // ─── Format Bot Message ────────────────────────────────────────
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

    function appendMessage(role, text, audioChunks) {
        var container = document.getElementById('aiChatMessages');
        if (!container) return;

        var msgId = 'aimsg_' + Date.now();
        var msgDiv = document.createElement('div');
        msgDiv.id = msgId;
        msgDiv.className = 'ai-message ' + (role === 'user' ? 'user' : 'bot');
        var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (role === 'user') {
            msgDiv.innerHTML = '<div class="ai-bubble">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div><div class="ai-msg-time">' + timeStr + '</div>';
        } else {
            if (audioChunks && audioChunks.length) {
                audioChunksStore[msgId] = audioChunks;
            }
            var btnHtml = '<button type="button" class="ai-audio-listen-btn" onclick="window.ProductAiChat.playAudio(\'' + msgId + '\', this)"><span>🔊</span> <span>শুনুন</span></button>';

            msgDiv.innerHTML = '<div class="ai-bubble"><div id="' + msgId + '_text">' + formatBotText(text) + '</div>' + btnHtml + '</div><div class="ai-msg-time">' + timeStr + '</div>';
        }

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        chatHistory.push({ role: role, content: text });
        return msgId;
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
            inner.innerHTML = '<div id="' + id + '_text">' + formatBotText(fullText) + '</div><span class="ai-cursor-pulse">|</span>';
            var container = document.getElementById('aiChatMessages');
            if (container) container.scrollTop = container.scrollHeight;
        }
    }

    function finalizeStreamingBubble(id, fullText, audioChunks) {
        var inner = document.getElementById(id + '_inner');
        if (inner) {
            if (audioChunks && audioChunks.length) {
                audioChunksStore[id] = audioChunks;
            }
            var btnHtml = '<button type="button" class="ai-audio-listen-btn" onclick="window.ProductAiChat.playAudio(\'' + id + '\', this)"><span>🔊</span> <span>শুনুন</span></button>';
            inner.innerHTML = '<div id="' + id + '_text">' + formatBotText(fullText) + '</div>' + btnHtml;
            inner.classList.remove('ai-bubble-streaming');
        }
        chatHistory.push({ role: 'assistant', content: fullText });
    }

    function removeElement(id) {
        if (!id) return;
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ─── Query Handling with Gemini 3.8 Live ───────────────────────
    async function handleUserQuestion(question) {
        appendMessage('user', question);

        var p = currentProduct || resolveProductInfo();
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');

        var systemPrompt = [
            'You are a helpful, courteous e-commerce assistant for "' + storeName + '".',
            'Product: "' + p.name + '", Price: ' + p.price + (p.sku ? (', SKU: ' + p.sku) : '') + '.',
            p.description ? ('Details: ' + p.description) : '',
            'Respond in Bengali (বাংলা) by default.',
            'Keep answers clear, polite, and helpful (2-4 sentences max unless detailed info is requested).'
        ].filter(Boolean).join('\n');

        var streamId = createStreamingBubble();
        var streamedSoFar = '';
        try {
            var res = await window.AIConfig.streamText({
                prompt: question,
                systemInstruction: systemPrompt,
                history: chatHistory.slice(-6)
            }, function (chunk, currentFull) {
                streamedSoFar = currentFull;
                updateStreamingBubble(streamId, currentFull);
            });

            var finalText = (res && res.text) || streamedSoFar;
            finalizeStreamingBubble(streamId, finalText, (res && res.audioChunks) || []);
        } catch (err) {
            console.error('AI Chat Error:', err);
            // If answer was already streamed to the user, NEVER delete it!
            if (streamedSoFar && streamedSoFar.trim().length > 5) {
                finalizeStreamingBubble(streamId, streamedSoFar, []);
            } else {
                removeElement(streamId);
                var errText = 'দুঃখিত! AI উত্তর দিতে পারেনি। অনুগ্রহ করে আবার প্রশ্নটি করুন।';
                appendMessage('assistant', errText, []);
            }
        }
    }

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

    // ─── Browser Microphone Speech-to-Text Dictation ───────────────
    function toggleInputDictation() {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            alert('আপনার ব্রাউজারে ভয়েস টাইপিং সাপোর্ট নেই। Chrome বা Edge ব্যবহার করুন।');
            return;
        }

        var btn = document.getElementById('aiDictateBtn');
        var input = document.getElementById('aiInputField');

        if (isDictating && dictationRec) {
            try { dictationRec.stop(); } catch(e){}
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            return;
        }

        dictationRec = new SpeechRec();
        dictationRec.lang = 'bn-BD';
        dictationRec.continuous = false;
        dictationRec.interimResults = false;

        dictationRec.onstart = function () {
            isDictating = true;
            if (btn) btn.classList.add('recording');
            if (input) input.placeholder = 'কথা বলুন, শুনছি...';
        };

        dictationRec.onresult = function (event) {
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';

            var transcript = '';
            if (event.results && event.results[0] && event.results[0][0]) {
                transcript = event.results[0][0].transcript;
            }
            if (transcript && transcript.trim()) {
                if (input) input.value = transcript.trim();
                handleUserQuestion(transcript.trim());
            }
        };

        dictationRec.onerror = function (event) {
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
            if (event.error === 'not-allowed') {
                alert('ব্রাউজার সেটিং থেকে মাইক্রোফোনের অনুমতি (Allow) দিন।');
            }
        };

        dictationRec.onend = function () {
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
        };

        try {
            dictationRec.start();
        } catch (e) {
            console.warn('Dictation start err:', e);
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
                appendMessage('assistant', 'হ্যালো! আমি আপনার স্মার্ট শপিং অ্যাসিস্ট্যান্ট। "' + (currentProduct.name || 'এই পণ্যটি') + '" সম্পর্কে যেকোনো প্রশ্ন করতে পারেন। কিভাবে সাহায্য করতে পারি?', []);
            }

            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.add('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');
            var input = document.getElementById('aiInputField');
            if (input) setTimeout(function () { input.focus(); }, 300);
        },

        close: function () {
            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.remove('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');
            if (activeAudioSource) {
                try { activeAudioSource.stop(); } catch(e){}
                activeAudioSource = null;
            }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
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
            handleUserQuestion(val);
        },

        sendChip: function (chipText) {
            handleUserQuestion(chipText);
        },

        toggleInputDictation: toggleInputDictation,

        playAudio: function (msgId, btnEl) {
            var chunks = audioChunksStore[msgId] || [];
            playPcmAudio(chunks, msgId, btnEl);
        }
    };

    window.ProductAiChat = ProductAiChat;
    window.openProductAiChat = function (prod) { ProductAiChat.open(prod); };

})(window);
