/**
 * AI Product Chat Assistant
 * Models:
 *  - gemini-2.5-flash-native-audio-preview-12-2025 (Direct Real-Time Live Phone Call via WebSocket)
 *  - gemini-3.8-live / gemini-3.5-flash (Text Chat & Comparison Engine)
 * 
 * Features:
 *  - Direct real-time phone call with Native Audio: NO send buttons, server-side VAD auto-detects speech
 *  - Stream opened once at call start, eliminating repeated permission popups
 *  - Real-time 16kHz PCM audio streaming & 24kHz streaming audio playback
 *  - Full multi-turn context memory preserved across voice & text
 */

(function (window) {
    'use strict';

    var currentProduct       = null;
    var chatHistory          = [];
    var isVoiceCallActive    = false;
    var isMuted              = false;
    var isAiSpeaking         = false;

    // Live Voice Call Hardware & Streaming State
    var liveStream           = null;
    var liveInputCtx         = null;
    var liveOutputCtx        = null;
    var liveProcessor        = null;
    var liveAnalyser         = null;
    var liveAnimId           = null;
    var liveSession          = null;
    var nextPlayTime         = 0;
    var activeAudioNodes     = [];

    // Text Chat Audio Playback Manager (for 🔊 শুনুন buttons)
    var textAudioCtx         = null;
    var textAudioSource      = null;
    var textAudioBtn         = null;
    var audioChunksStore     = {};

    // ─── Helpers: Audio Resampling & Base64 ─────────────────────────
    function downsampleTo16kHz(inputBuffer, inputSampleRate) {
        if (inputSampleRate === 16000) {
            var int16 = new Int16Array(inputBuffer.length);
            for (var i = 0; i < inputBuffer.length; i++) {
                var s = Math.max(-1, Math.min(1, inputBuffer[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return int16;
        }

        var ratio = inputSampleRate / 16000;
        var outputLength = Math.round(inputBuffer.length / ratio);
        var result = new Int16Array(outputLength);

        for (var i = 0; i < outputLength; i++) {
            var srcIndex = Math.floor(i * ratio);
            var s = Math.max(-1, Math.min(1, inputBuffer[srcIndex] || 0));
            result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return result;
    }

    function arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        var chunkSize = 0x8000;
        for (var i = 0; i < len; i += chunkSize) {
            var chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

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
            '        <button class="ai-btn-header-call" id="aiHeaderCallBtn" title="লাইভ ভয়েস কল" onclick="window.ProductAiChat.toggleVoiceCall()">',
            '          <span>📞</span> <span id="aiHeaderCallBtnText">ভয়েস কল</span>',
            '        </button>',
            '        <button class="ai-btn-ctrl" title="ছোট করুন" onclick="window.ProductAiChat.minimize()">─</button>',
            '        <button class="ai-btn-ctrl" title="বন্ধ করুন" onclick="window.ProductAiChat.close()">✕</button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Voice Call Panel (Direct Phone Call Screen) -->',
            '    <div class="ai-voice-panel" id="aiVoicePanel">',
            '      <div class="ai-voice-product-tag" id="aiVoiceProductTag">',
            '        <img id="aiVoiceProdImg" src="" alt="">',
            '        <span id="aiVoiceProdName">পণ্য লোড হচ্ছে...</span>',
            '      </div>',
            '',
            '      <div class="ai-voice-orb" id="aiVoiceOrb">🎙️</div>',
            '',
            '      <div>',
            '        <div class="ai-voice-status-title" id="aiVoiceStatusTitle">সংযোগ হচ্ছে...</div>',
            '        <div class="ai-voice-status-desc" id="aiVoiceStatusDesc">সরাসরি কথা বলুন, সেন্ড বাটনের প্রয়োজন নেই</div>',
            '      </div>',
            '',
            '      <div class="ai-sound-waves" id="aiVoiceWaves">',
            '        <div class="ai-wave-bar" id="aiWaveBar1"></div>',
            '        <div class="ai-wave-bar" id="aiWaveBar2"></div>',
            '        <div class="ai-wave-bar" id="aiWaveBar3"></div>',
            '        <div class="ai-wave-bar" id="aiWaveBar4"></div>',
            '        <div class="ai-wave-bar" id="aiWaveBar5"></div>',
            '      </div>',
            '',
            '      <div class="ai-voice-transcript" id="aiVoiceTranscript">',
            '        <div class="ai-live-ai-speech" id="aiLiveAiSpeech">সংযোগ হচ্ছে... সরাসরি কথা বলুন।</div>',
            '      </div>',
            '',
            '      <div class="ai-voice-actions">',
            '        <button type="button" class="ai-btn-voice-toggle" id="aiVoiceMuteBtn" onclick="window.ProductAiChat.toggleMute()">',
            '          <span id="aiMuteIcon">🔇</span> <span id="aiMuteText">মিউট</span>',
            '        </button>',
            '        <button type="button" class="ai-btn-voice-toggle" onclick="window.ProductAiChat.showChatView()">',
            '          <span>💬</span> <span>টেক্সট চ্যাট</span>',
            '        </button>',
            '        <button type="button" class="ai-btn-call-end" onclick="window.ProductAiChat.endVoiceCall()">',
            '          <span>❌</span> <span>কল শেষ</span>',
            '        </button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Product Context Bar (Active in Text Mode) -->',
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
            '      <button class="ai-chip" onclick="window.ProductAiChat.startVoiceCall()">📞 সরাসরি লাইভ কল করুন</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই পণ্যের প্রধান ফিচারগুলো কী?\')">প্রধান ফিচারগুলো কী?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ডেলিভারি চার্জ ও সময় কত লাগবে?\')">ডেলিভারি সময় কত?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই প্রোডাক্টে কি কোনো বিশেষ অফার আছে?\')">কোনো অফার আছে?</button>',
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

    // ─── Play Live 24kHz Streaming Audio Chunks (Phone Call) ──────
    function playLivePcmChunk(base64Data) {
        if (!liveOutputCtx) {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            liveOutputCtx = new AudioCtx({ sampleRate: 24000 });
        }
        if (liveOutputCtx.state === 'suspended') {
            liveOutputCtx.resume();
        }

        try {
            var binaryStr = atob(base64Data);
            var len = binaryStr.length;
            var int16 = new Int16Array(len / 2);
            for (var i = 0; i < len; i += 2) {
                int16[i / 2] = binaryStr.charCodeAt(i) | (binaryStr.charCodeAt(i + 1) << 8);
            }
            var float32 = new Float32Array(int16.length);
            for (var i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768;
            }

            var buffer = liveOutputCtx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);

            var source = liveOutputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(liveOutputCtx.destination);

            var now = liveOutputCtx.currentTime;
            if (nextPlayTime < now) nextPlayTime = now;
            source.start(nextPlayTime);
            nextPlayTime += buffer.duration;

            activeAudioNodes.push(source);
            source.onended = function () {
                var idx = activeAudioNodes.indexOf(source);
                if (idx > -1) activeAudioNodes.splice(idx, 1);

                if (activeAudioNodes.length === 0 && liveOutputCtx.currentTime >= nextPlayTime - 0.05) {
                    isAiSpeaking = false;
                    if (isVoiceCallActive) {
                        updateVoiceCallStatus('listening', 'আপনার কথা শুনছি...', 'সরাসরি কথা বলুন...');
                    }
                }
            };
        } catch (e) {
            console.error('playLivePcmChunk error:', e);
        }
    }

    function stopLiveAudioPlayback() {
        activeAudioNodes.forEach(function (src) {
            try { src.stop(); } catch(e){}
        });
        activeAudioNodes = [];
        if (liveOutputCtx) {
            nextPlayTime = liveOutputCtx.currentTime;
        }
        isAiSpeaking = false;
    }

    // ─── Play Saved Audio Chunks in Chat View (🔊 শুনুন button) ───
    function playChatAudio(chunks, msgId, btnEl) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (textAudioSource) {
            try { textAudioSource.stop(); } catch (e) {}
            textAudioSource = null;
            if (textAudioBtn) {
                textAudioBtn.classList.remove('playing');
                textAudioBtn.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
            }
            if (textAudioBtn === btnEl) {
                textAudioBtn = null;
                return;
            }
        }

        if (!textAudioCtx) {
            textAudioCtx = new AudioCtx({ sampleRate: 24000 });
        }
        if (textAudioCtx.state === 'suspended') {
            textAudioCtx.resume();
        }

        if (!chunks || !chunks.length) {
            var msgText = document.getElementById(msgId + '_text') ? document.getElementById(msgId + '_text').innerText : '';
            if (msgText && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                var utt = new SpeechSynthesisUtterance(msgText);
                utt.lang = 'bn-BD';
                utt.rate = 1.05;
                if (btnEl) {
                    btnEl.classList.add('playing');
                    btnEl.innerHTML = '<span>⏹️</span> <span>থামান</span>';
                    textAudioBtn = btnEl;
                }
                utt.onend = function () {
                    if (btnEl) {
                        btnEl.classList.remove('playing');
                        btnEl.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
                        textAudioBtn = null;
                    }
                };
                window.speechSynthesis.speak(utt);
            }
            return;
        }

        try {
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

            var audioBuffer = textAudioCtx.createBuffer(1, totalLength, 24000);
            var channel = audioBuffer.getChannelData(0);
            var offset = 0;
            for (var b = 0; b < buffers.length; b++) {
                channel.set(buffers[b], offset);
                offset += buffers[b].length;
            }

            var source = textAudioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(textAudioCtx.destination);

            textAudioSource = source;
            textAudioBtn = btnEl;

            if (btnEl) {
                btnEl.classList.add('playing');
                btnEl.innerHTML = '<span>⏹️</span> <span>থামান</span>';
            }

            source.onended = function () {
                if (textAudioSource === source) {
                    textAudioSource = null;
                    if (btnEl) {
                        btnEl.classList.remove('playing');
                        btnEl.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
                    }
                    textAudioBtn = null;
                }
            };

            source.start(0);
        } catch (e) {
            console.error('playChatAudio error:', e);
        }
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
            chatHistory.push({ role: 'user', content: text });
        } else {
            if (audioChunks && audioChunks.length) {
                audioChunksStore[msgId] = audioChunks;
            }
            var btnHtml = '<button type="button" class="ai-audio-listen-btn" onclick="window.ProductAiChat.playAudio(\'' + msgId + '\', this)"><span>🔊</span> <span>শুনুন</span></button>';
            msgDiv.innerHTML = '<div class="ai-bubble"><div id="' + msgId + '_text">' + formatBotText(text) + '</div>' + btnHtml + '</div><div class="ai-msg-time">' + timeStr + '</div>';
            chatHistory.push({ role: 'assistant', content: text });
        }

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
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

    // ─── Query Handling for Text Input Bar ─────────────────────────
    async function handleUserQuestion(question) {
        if (!question || !question.trim()) return;
        var q = question.trim();
        appendMessage('user', q);

        var p = currentProduct || resolveProductInfo();
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');

        var systemPrompt = [
            'You are a courteous, expert AI shopping assistant for "' + storeName + '".',
            'Current Product: "' + p.name + '", Price: ' + p.price + (p.sku ? (', SKU: ' + p.sku) : '') + '.',
            p.description ? ('Details: ' + p.description) : '',
            'Customer language: Bengali or English. Always respond politely in fluent Bengali (বাংলা).',
            'Keep answers natural, helpful, and concise (2-3 sentences max).'
        ].filter(Boolean).join('\n');

        var streamId = createStreamingBubble();
        var streamedSoFar = '';

        try {
            var res = await window.AIConfig.streamText({
                prompt: q,
                systemInstruction: systemPrompt,
                history: chatHistory.slice(-8)
            }, function (chunk, currentFull) {
                streamedSoFar = currentFull;
                updateStreamingBubble(streamId, currentFull);
            });

            var finalText = (res && res.text) || streamedSoFar;
            finalizeStreamingBubble(streamId, finalText, (res && res.audioChunks) || []);
        } catch (err) {
            console.error('AI Chat Error:', err);
            if (streamedSoFar && streamedSoFar.trim().length > 5) {
                finalizeStreamingBubble(streamId, streamedSoFar, []);
            } else {
                removeElement(streamId);
                var errText = 'দুঃখিত! AI উত্তর দিতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।';
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

    // ─── Voice Call UI State & Wave Animations ─────────────────────
    function updateVoiceCallStatus(state, title, desc) {
        var orb = document.getElementById('aiVoiceOrb');
        var titleEl = document.getElementById('aiVoiceStatusTitle');
        var descEl = document.getElementById('aiVoiceStatusDesc');
        var wavesEl = document.getElementById('aiVoiceWaves');

        if (orb) {
            orb.className = 'ai-voice-orb ' + (state || '');
            if (state === 'listening') orb.textContent = '🎙️';
            else if (state === 'thinking') orb.textContent = '✨';
            else if (state === 'speaking') orb.textContent = '🔊';
            else orb.textContent = '📞';
        }

        if (titleEl && title) titleEl.textContent = title;
        if (descEl && desc) descEl.textContent = desc;

        if (wavesEl) {
            if (state === 'listening' || state === 'speaking') wavesEl.classList.add('active');
            else wavesEl.classList.remove('active');
        }
    }

    function animateWaveBars(volume) {
        for (var i = 1; i <= 5; i++) {
            var bar = document.getElementById('aiWaveBar' + i);
            if (bar) {
                var factor = (i === 3 ? 1.6 : (i === 2 || i === 4 ? 1.2 : 0.8));
                var h = Math.max(6, Math.min(38, Math.round(8 + volume * 42 * factor)));
                bar.style.height = h + 'px';
            }
        }
    }

    // ─── Robust Universal Microphone Stream Acquisition ───────────
    async function acquireMicrophoneStream() {
        // 1. Modern navigator.mediaDevices.getUserMedia (audio: true without complex constraints)
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            try {
                return await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err1) {
                console.warn('getUserMedia audio:true failed, trying basic audio constraints fallback:', err1);
                try {
                    return await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                    });
                } catch (err2) {
                    throw err1;
                }
            }
        }

        // 2. Legacy navigator.getUserMedia / webkitGetUserMedia / mozGetUserMedia
        var legacyFn = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (legacyFn) {
            return new Promise(function (resolve, reject) {
                legacyFn.call(navigator, { audio: true }, resolve, reject);
            });
        }

        // 3. Diagnose insecure context (HTTP instead of HTTPS or localhost)
        if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            throw new Error('মাইক্রোফোন ব্যবহারের জন্য সাইটটি HTTPS প্রোটোকলে (বা localhost-এ) চালানো প্রয়োজন।');
        }

        throw new Error('ব্রাউজারে মাইক্রোফোন অ্যাক্সেস সুবিধা পাওয়া যায়নি।');
    }

    // ─── Direct Live Phone Call (Native Audio WebSocket) ───────────
    async function startVoiceCall() {
        initAiChat();
        var backdrop = document.getElementById('aiChatBackdrop');
        if (backdrop) backdrop.classList.add('active');
        var bubble = document.getElementById('aiFloatingBubble');
        if (bubble) bubble.classList.remove('show');

        isVoiceCallActive = true;
        isMuted = false;
        isAiSpeaking = false;

        var headerBtn = document.getElementById('aiHeaderCallBtn');
        var headerBtnText = document.getElementById('aiHeaderCallBtnText');
        if (headerBtn) headerBtn.classList.add('active-call');
        if (headerBtnText) headerBtnText.textContent = 'কল চলছে';

        var voicePanel = document.getElementById('aiVoicePanel');
        var productBar = document.getElementById('aiProductBar');
        var chatMessages = document.getElementById('aiChatMessages');
        var chipsRow = document.getElementById('aiChipsRow');
        var footer = document.getElementById('aiChatFooter');

        if (voicePanel) voicePanel.classList.add('active');
        if (productBar) productBar.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'none';
        if (chipsRow) chipsRow.style.display = 'none';
        if (footer) footer.style.display = 'none';

        var p = currentProduct || resolveProductInfo();
        var tagImg = document.getElementById('aiVoiceProdImg');
        var tagName = document.getElementById('aiVoiceProdName');
        if (tagImg) {
            if (p.image) {
                tagImg.src = p.image;
                tagImg.style.display = 'block';
            } else {
                tagImg.style.display = 'none';
            }
        }
        if (tagName) tagName.textContent = p.name + ' (' + p.price + ')';

        updateVoiceCallStatus('thinking', 'সংযোগ হচ্ছে...', 'মাইক্রোফোন সক্রিয় হচ্ছে...');

        // 1. Open Physical Microphone ONCE at call start with universal fallback
        try {
            if (!liveStream) {
                liveStream = await acquireMicrophoneStream();
            }
        } catch (micErr) {
            console.error('Microphone access failed:', micErr);
            updateVoiceCallStatus('idle', 'মাইক্রোফোন চালু করা যায়নি', micErr.message || 'মাইক্রোফোন সেটিংস চেক করুন');
            var errEl = document.getElementById('aiLiveAiSpeech');
            if (errEl) {
                errEl.textContent = '⚠️ ' + (micErr.message || 'মাইক্রোফোন পাওয়া যায়নি। ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে মাইক্রোফোন Allow করুন।');
            }
            return;
        }

        // 2. Set up Web Audio context for continuous 16kHz PCM streaming & wave animation
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!liveInputCtx) liveInputCtx = new AudioCtx();
            if (liveInputCtx.state === 'suspended') await liveInputCtx.resume();

            var source = liveInputCtx.createMediaStreamSource(liveStream);
            liveAnalyser = liveInputCtx.createAnalyser();
            liveAnalyser.fftSize = 256;
            source.connect(liveAnalyser);

            // ScriptProcessorNode for real-time 16kHz downsampling
            liveProcessor = liveInputCtx.createScriptProcessor(4096, 1, 1);
            var muteGain = liveInputCtx.createGain();
            muteGain.gain.value = 0; // Prevent local mic audio from echoing through speakers
            liveProcessor.connect(muteGain);
            muteGain.connect(liveInputCtx.destination);
            source.connect(liveProcessor);

            var freqData = new Uint8Array(liveAnalyser.frequencyBinCount);
            var updateAnim = function () {
                if (!isVoiceCallActive) return;
                if (liveAnalyser) {
                    liveAnalyser.getByteFrequencyData(freqData);
                    var sum = 0;
                    for (var i = 0; i < freqData.length; i++) sum += freqData[i];
                    var avg = sum / freqData.length;
                    animateWaveBars(Math.min(1, avg / 110));
                }
                liveAnimId = requestAnimationFrame(updateAnim);
            };
            liveAnimId = requestAnimationFrame(updateAnim);

            liveProcessor.onaudioprocess = function (e) {
                if (!isVoiceCallActive || isMuted || isAiSpeaking || !liveSession) return;
                var inputFloats = e.inputBuffer.getChannelData(0);
                var pcm16 = downsampleTo16kHz(inputFloats, liveInputCtx.sampleRate);
                var b64 = arrayBufferToBase64(pcm16.buffer);
                liveSession.sendAudioChunk(b64);
            };
        } catch (audioErr) {
            console.warn('Web Audio input setup error:', audioErr);
        }

        // 3. Connect Native Audio Live WebSocket (gemini-2.5-flash-native-audio-preview-12-2025)
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');
        var systemInstruction = [
            'You are a courteous, natural AI voice assistant for "' + storeName + '" on a live customer phone call.',
            'Current Product: "' + p.name + '", Price: ' + p.price + (p.sku ? (', SKU: ' + p.sku) : '') + '.',
            p.description ? ('Product Details: ' + p.description) : '',
            'Customer is speaking live on the phone. Speak in friendly, clear Bengali (বাংলা).',
            'Keep your responses conversational, direct, and concise (1-2 sentences) so it sounds like a real phone call.'
        ].filter(Boolean).join('\n');

        liveSession = window.AIConfig.createLiveCallSession({
            systemInstruction: systemInstruction,
            voiceName: 'Puck'
        }, {
            onReady: function (info) {
                updateVoiceCallStatus('listening', 'কল সংযুক্ত হয়েছে', 'সরাসরি কথা বলুন, আমি শুনছি...');
                var el = document.getElementById('aiLiveAiSpeech');
                if (el) el.textContent = '📞 কল সংযুক্ত হয়েছে। পণ্যটি সম্পর্কে যা জানতে চান সরাসরি কথা বলুন।';
            },
            onAudioChunk: function (pcm24B64) {
                isAiSpeaking = true;
                updateVoiceCallStatus('speaking', 'AI কথা বলছে...', 'উত্তর শুনুন...');
                playLivePcmChunk(pcm24B64);
            },
            onTranscript: function (text) {
                var el = document.getElementById('aiLiveAiSpeech');
                if (el) el.textContent = 'AI: ' + text;
                // Add to history transcript
                if (text && text.trim().length > 3) {
                    chatHistory.push({ role: 'assistant', content: text.trim() });
                }
            },
            onInterrupted: function () {
                stopLiveAudioPlayback();
                isAiSpeaking = false;
                updateVoiceCallStatus('listening', 'আপনার কথা শুনছি...', 'বলুন...');
            },
            onTurnComplete: function () {
                // Handled in playback onended
            },
            onError: function (err) {
                console.error('Live call session error:', err);
                updateVoiceCallStatus('idle', 'সংযোগ বিচ্ছিন্ন', err.message || 'পুনরায় কল করুন');
            },
            onClose: function () {
                if (isVoiceCallActive) {
                    updateVoiceCallStatus('idle', 'কল শেষ হয়েছে', 'পুনরায় কল করতে পারেন');
                }
            }
        });
    }

    function endVoiceCall() {
        isVoiceCallActive = false;
        isAiSpeaking = false;

        if (liveAnimId) {
            cancelAnimationFrame(liveAnimId);
            liveAnimId = null;
        }

        if (liveSession) {
            try { liveSession.close(); } catch (e) {}
            liveSession = null;
        }

        stopLiveAudioPlayback();

        // Stop microphone stream tracks so hardware mic turns OFF
        if (liveStream) {
            try {
                liveStream.getTracks().forEach(function (track) { track.stop(); });
            } catch (e) {}
            liveStream = null;
        }

        if (liveProcessor) {
            try { liveProcessor.disconnect(); } catch (e) {}
            liveProcessor = null;
        }

        if (liveInputCtx) {
            try { liveInputCtx.close(); } catch (e) {}
            liveInputCtx = null;
        }

        if (liveOutputCtx) {
            try { liveOutputCtx.close(); } catch (e) {}
            liveOutputCtx = null;
        }

        var headerBtn = document.getElementById('aiHeaderCallBtn');
        var headerBtnText = document.getElementById('aiHeaderCallBtnText');
        if (headerBtn) headerBtn.classList.remove('active-call');
        if (headerBtnText) headerBtnText.textContent = 'ভয়েস কল';

        showChatView();
    }

    function toggleMute() {
        isMuted = !isMuted;
        var icon = document.getElementById('aiMuteIcon');
        var text = document.getElementById('aiMuteText');
        if (icon) icon.textContent = isMuted ? '🔊' : '🔇';
        if (text) text.textContent = isMuted ? 'আনমিউট' : 'মিউট';

        var descEl = document.getElementById('aiVoiceStatusDesc');
        if (descEl) {
            descEl.textContent = isMuted ? '(মাইক্রোফোন মিউট করা আছে)' : 'সরাসরি কথা বলুন, আমি শুনছি...';
        }
    }

    function showChatView() {
        var voicePanel = document.getElementById('aiVoicePanel');
        var productBar = document.getElementById('aiProductBar');
        var chatMessages = document.getElementById('aiChatMessages');
        var chipsRow = document.getElementById('aiChipsRow');
        var footer = document.getElementById('aiChatFooter');

        if (voicePanel) voicePanel.classList.remove('active');
        if (productBar) productBar.style.display = 'flex';
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chipsRow) chipsRow.style.display = 'flex';
        if (footer) footer.style.display = 'block';

        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function toggleVoiceCall() {
        if (isVoiceCallActive) {
            endVoiceCall();
        } else {
            startVoiceCall();
        }
    }

    // ─── Input Bar Dictation (One-touch Voice Note) ────────────────
    var dictationRec = null;
    function toggleInputDictation() {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            startVoiceCall();
            return;
        }

        var btn = document.getElementById('aiDictateBtn');
        var input = document.getElementById('aiInputField');

        if (dictationRec) {
            try { dictationRec.stop(); } catch(e){}
            dictationRec = null;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
            return;
        }

        dictationRec = new SpeechRec();
        dictationRec.lang = 'bn-BD';
        dictationRec.continuous = false;
        dictationRec.interimResults = false;

        dictationRec.onstart = function () {
            if (btn) btn.classList.add('recording');
            if (input) input.placeholder = '🎙️ কথা বলুন, শুনছি...';
        };

        dictationRec.onresult = function (event) {
            dictationRec = null;
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

        dictationRec.onerror = function () {
            dictationRec = null;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
        };

        dictationRec.onend = function () {
            dictationRec = null;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
        };

        try {
            dictationRec.start();
        } catch (e) {
            dictationRec = null;
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
                appendMessage('assistant', 'হ্যালো! আমি আপনার স্মার্ট শপিং সহকারী। "' + (currentProduct.name || 'এই পণ্যটি') + '" সম্পর্কে যেকোনো প্রশ্ন লিখতে পারেন, অথবা উপরে "📞 ভয়েস কল" বাটনে ক্লিক করে সরাসরি কথা বলতে পারেন।', []);
            }

            showChatView();

            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.add('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');
            var input = document.getElementById('aiInputField');
            if (input) setTimeout(function () { input.focus(); }, 300);
        },

        close: function () {
            if (isVoiceCallActive) {
                endVoiceCall();
            }
            var backdrop = document.getElementById('aiChatBackdrop');
            if (backdrop) backdrop.classList.remove('active');
            var bubble = document.getElementById('aiFloatingBubble');
            if (bubble) bubble.classList.remove('show');

            if (textAudioSource) {
                try { textAudioSource.stop(); } catch(e){}
                textAudioSource = null;
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
        startVoiceCall: startVoiceCall,
        endVoiceCall: endVoiceCall,
        toggleVoiceCall: toggleVoiceCall,
        toggleMute: toggleMute,
        showChatView: showChatView,

        playAudio: function (msgId, btnEl) {
            var chunks = audioChunksStore[msgId] || [];
            playChatAudio(chunks, msgId, btnEl);
        }
    };

    window.ProductAiChat = ProductAiChat;
    window.openProductAiChat = function (prod) { ProductAiChat.open(prod); };

})(window);
