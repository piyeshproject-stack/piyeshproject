/**
 * AI Product Chat Assistant
 * Gemini 3.8 Live Engine (WebSocket BidiGenerateContent & REST Fallback)
 * 
 * Features:
 *  - Real physical microphone capture via navigator.mediaDevices.getUserMedia
 *  - Real-time voice volume detection & animated wave bars via Web Audio AnalyserNode
 *  - High-resilience MediaRecorder audio fallback (works on all modern browsers & webviews)
 *  - Full Interactive Voice Call Mode with animated glowing orb and automatic audio reply playback
 *  - Preserved multi-turn conversation context window across text & voice
 */

(function (window) {
    'use strict';

    var currentProduct       = null;
    var chatHistory          = [];
    var isVoiceCallActive    = false;
    var isDictating          = false;

    // Audio Playback Manager for 24kHz 16-bit PCM returned by Gemini Live
    var audioCtx             = null;
    var activeAudioSource    = null;
    var activeAudioBtn       = null;
    var audioChunksStore     = {}; // map of msgId -> array of base64 chunks

    // ─── Physical Microphone Audio Engine ──────────────────────────
    var MicEngine = {
        stream: null,
        audioCtx: null,
        analyser: null,
        animId: null,
        mediaRecorder: null,
        recordedChunks: [],
        speechRec: null,
        isRecording: false,
        activeTranscript: '',

        start: async function (callbacks) {
            callbacks = callbacks || {};
            if (this.isRecording) {
                await this.stop();
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('আপনার ব্রাউজারে মাইক্রোফোন ব্যবহারের সুবিধা (getUserMedia) সাপোর্ট নেই।');
            }

            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            } catch (err) {
                console.error('Microphone access error:', err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    throw new Error('মাইক্রোফোন পারমিশন ব্লক করা আছে। ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে মাইক্রোফোন Allow করুন।');
                }
                if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    throw new Error('কোনো মাইক্রোফোন ডিভাইস পাওয়া যায়নি। অনুগ্রহ করে মাইক্রোফোন যুক্ত করুন।');
                }
                throw new Error('মাইক্রোফোন চালু করা যায়নি: ' + (err.message || 'Error'));
            }

            this.isRecording = true;
            this.activeTranscript = '';
            this.recordedChunks = [];

            // Web Audio Analyser for live volume measurement & wave animation
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.audioCtx = new AudioCtx();
                    var source = this.audioCtx.createMediaStreamSource(this.stream);
                    this.analyser = this.audioCtx.createAnalyser();
                    this.analyser.fftSize = 256;
                    source.connect(this.analyser);

                    var dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                    var self = this;

                    var updateVolume = function () {
                        if (!self.isRecording || !self.analyser) return;
                        self.analyser.getByteFrequencyData(dataArray);

                        var sum = 0;
                        for (var i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        var avg = sum / dataArray.length;
                        var norm = Math.min(1, avg / 120);

                        if (typeof callbacks.onVolume === 'function') {
                            callbacks.onVolume(norm, dataArray);
                        }
                        self.animId = requestAnimationFrame(updateVolume);
                    };
                    this.animId = requestAnimationFrame(updateVolume);
                }
            } catch (e) {
                console.warn('Audio analyser init warning:', e);
            }

            // MediaRecorder for recording audio chunks as fallback or multimodal audio
            var mime = '';
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus';
                else if (MediaRecorder.isTypeSupported('audio/webm')) mime = 'audio/webm';
                else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4';
                else if (MediaRecorder.isTypeSupported('audio/ogg')) mime = 'audio/ogg';

                try {
                    this.mediaRecorder = mime ? new MediaRecorder(this.stream, { mimeType: mime }) : new MediaRecorder(this.stream);
                    var rec = this.mediaRecorder;
                    var selfRec = this;
                    rec.ondataavailable = function (e) {
                        if (e.data && e.data.size > 0) {
                            selfRec.recordedChunks.push(e.data);
                        }
                    };
                    rec.start(250);
                } catch (recErr) {
                    console.warn('MediaRecorder warning:', recErr);
                }
            }

            // Concurrently run SpeechRecognition for fast local transcription if supported
            var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    this.speechRec = new SpeechRec();
                    this.speechRec.lang = 'bn-BD';
                    this.speechRec.continuous = true;
                    this.speechRec.interimResults = true;

                    var selfSpeech = this;
                    this.speechRec.onresult = function (event) {
                        var interim = '';
                        for (var i = event.resultIndex; i < event.results.length; i++) {
                            var item = event.results[i];
                            if (item.isFinal) {
                                selfSpeech.activeTranscript += (selfSpeech.activeTranscript ? ' ' : '') + item[0].transcript;
                            } else {
                                interim += item[0].transcript;
                            }
                        }
                        var fullText = (selfSpeech.activeTranscript + ' ' + interim).trim();
                        if (typeof callbacks.onTranscript === 'function') {
                            callbacks.onTranscript(fullText, false);
                        }
                    };

                    this.speechRec.onerror = function (e) {
                        console.warn('SpeechRecognition warning:', e.error);
                    };

                    this.speechRec.start();
                } catch (srErr) {
                    console.warn('SpeechRecognition start warning:', srErr);
                }
            }

            return true;
        },

        stop: async function () {
            if (!this.isRecording) return null;
            this.isRecording = false;

            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }

            if (this.speechRec) {
                try { this.speechRec.stop(); } catch (e) {}
                this.speechRec = null;
            }

            if (this.audioCtx) {
                try { this.audioCtx.close(); } catch (e) {}
                this.audioCtx = null;
                this.analyser = null;
            }

            var recordedBlob = null;
            var recordedBase64 = '';
            var finalMime = 'audio/webm';

            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                var mr = this.mediaRecorder;
                finalMime = mr.mimeType || 'audio/webm';
                await new Promise(function (res) {
                    mr.onstop = res;
                    try { mr.stop(); } catch (e) { res(); }
                });
            }

            if (this.recordedChunks.length > 0) {
                recordedBlob = new Blob(this.recordedChunks, { type: finalMime });
                try {
                    recordedBase64 = await new Promise(function (res) {
                        var reader = new FileReader();
                        reader.onloadend = function () {
                            var dataUrl = reader.result || '';
                            var b64 = dataUrl.split(',')[1] || '';
                            res(b64);
                        };
                        reader.onerror = function () { res(''); };
                        reader.readAsDataURL(recordedBlob);
                    });
                } catch (e) {}
            }

            // Stop all media tracks to turn off the physical microphone device indicator
            if (this.stream) {
                try {
                    this.stream.getTracks().forEach(function (track) {
                        track.stop();
                    });
                } catch (e) {}
                this.stream = null;
            }

            var result = {
                transcript: (this.activeTranscript || '').trim(),
                blob: recordedBlob,
                base64: recordedBase64,
                mimeType: finalMime
            };

            this.recordedChunks = [];
            this.activeTranscript = '';
            return result;
        }
    };

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
            '        <button class="ai-btn-header-call" id="aiHeaderCallBtn" title="লাইভ ভয়েস কল শুরু করুন" onclick="window.ProductAiChat.toggleVoiceCall()">',
            '          <span>📞</span> <span id="aiHeaderCallBtnText">ভয়েস কল</span>',
            '        </button>',
            '        <button class="ai-btn-ctrl" title="ছোট করুন" onclick="window.ProductAiChat.minimize()">─</button>',
            '        <button class="ai-btn-ctrl" title="বন্ধ করুন" onclick="window.ProductAiChat.close()">✕</button>',
            '      </div>',
            '    </div>',
            '',
            '    <!-- Voice Call Panel (Active in Voice Mode) -->',
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
            '        <div class="ai-voice-status-desc" id="aiVoiceStatusDesc">মাইক্রোফোন সক্রিয় হচ্ছে...</div>',
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
            '        <div class="ai-live-user-speech" id="aiLiveUserSpeech"></div>',
            '        <div class="ai-live-ai-speech" id="aiLiveAiSpeech">কথা বলুন, আমি শুনছি...</div>',
            '      </div>',
            '',
            '      <div class="ai-voice-actions">',
            '        <button type="button" class="ai-btn-voice-talk recording" id="aiVoiceTalkBtn" onclick="window.ProductAiChat.toggleVoiceCallMic()">',
            '          <span>🔴</span> <span id="aiVoiceTalkBtnText">কথা শেষ / পাঠান</span>',
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
            '      <button class="ai-chip" onclick="window.ProductAiChat.startVoiceCall()">📞 সরাসরি ভয়েস কল করুন</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই পণ্যের প্রধান ফিচারগুলো কী?\')">প্রধান ফিচারগুলো কী?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'ডেলিভারি চার্জ ও সময় কত লাগবে?\')">ডেলিভারি সময় কত?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'এই প্রোডাক্টে কি কোনো বিশেষ অফার আছে?\')">কোনো অফার আছে?</button>',
            '      <button class="ai-chip" onclick="window.ProductAiChipClick(\'অর্ডার করার নিয়ম কী?\')">অর্ডার প্রসেস কী?</button>',
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

    // ─── Play 24kHz 16-bit PCM Audio Chunks ─────────────────────────
    function playPcmAudio(chunks, msgId, btnEl, onEnded) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            if (typeof onEnded === 'function') onEnded();
            return;
        }

        // If currently playing, stop previous source
        if (activeAudioSource) {
            try { activeAudioSource.stop(); } catch (e) {}
            activeAudioSource = null;
            if (activeAudioBtn) {
                activeAudioBtn.classList.remove('playing');
                activeAudioBtn.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
            }
            if (activeAudioBtn === btnEl && !onEnded) {
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

        // Fallback to SpeechSynthesis if chunks empty
        if (!chunks || !chunks.length) {
            var msgText = (document.getElementById(msgId + '_text') ? document.getElementById(msgId + '_text').innerText : '') ||
                          (document.getElementById('aiLiveAiSpeech') ? document.getElementById('aiLiveAiSpeech').innerText : '');
            if (msgText && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                var clean = msgText.replace(/^AI:\s*/i, '');
                var utt = new SpeechSynthesisUtterance(clean);
                utt.lang = 'bn-BD';
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
                    if (typeof onEnded === 'function') onEnded();
                };
                utt.onerror = function () {
                    if (btnEl) {
                        btnEl.classList.remove('playing');
                        btnEl.innerHTML = '<span>🔊</span> <span>শুনুন</span>';
                        activeAudioBtn = null;
                    }
                    if (typeof onEnded === 'function') onEnded();
                };
                window.speechSynthesis.speak(utt);
            } else {
                if (typeof onEnded === 'function') onEnded();
            }
            return;
        }

        // Decode PCM
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

            if (totalLength === 0) {
                if (typeof onEnded === 'function') onEnded();
                return;
            }

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
                if (typeof onEnded === 'function') onEnded();
            };

            source.start(0);
        } catch (decErr) {
            console.error('PCM audio play error:', decErr);
            if (typeof onEnded === 'function') onEnded();
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

    // ─── Query Handling with Gemini 3.8 Live ───────────────────────
    async function handleUserQuestion(question, audioObj, isVoiceCall) {
        var hasText = question && question.trim().length > 0;
        var hasAudio = audioObj && audioObj.base64 && audioObj.base64.length > 0;

        if (!hasText && !hasAudio) return;

        var displayText = hasText ? question.trim() : '🎙️ [ভয়েস মেসেজ]';
        appendMessage('user', displayText);

        if (isVoiceCall) {
            updateVoiceCallStatus('thinking', 'AI চিন্তা করছে...', 'উত্তর তৈরি হচ্ছে...');
            var transcriptEl = document.getElementById('aiLiveUserSpeech');
            if (transcriptEl) transcriptEl.textContent = 'আপনি: ' + displayText;
        }

        var p = currentProduct || resolveProductInfo();
        var storeName = (window.siteSettings && window.siteSettings.store_name) || (typeof CONFIG !== 'undefined' ? CONFIG.STORE_NAME : 'Store');

        var systemPrompt = [
            'You are a friendly, knowledgeable AI shopping assistant for "' + storeName + '".',
            'Current Product: "' + p.name + '", Price: ' + p.price + (p.sku ? (', SKU: ' + p.sku) : '') + '.',
            p.description ? ('Details: ' + p.description) : '',
            'Customer may speak or write in Bengali or English. Always respond politely in fluent Bengali (বাংলা).',
            'Keep answers natural, helpful, and concise (2-3 sentences max) so it sounds great on voice playback.'
        ].filter(Boolean).join('\n');

        var streamId = createStreamingBubble();
        var streamedSoFar = '';

        try {
            var res = await window.AIConfig.streamText({
                prompt: question || 'এই পণ্য সম্পর্কে প্রয়োজনীয় তথ্য দিন',
                audio: hasAudio ? { base64: audioObj.base64, mimeType: audioObj.mimeType } : null,
                systemInstruction: systemPrompt,
                history: chatHistory.slice(-8)
            }, function (chunk, currentFull) {
                streamedSoFar = currentFull;
                updateStreamingBubble(streamId, currentFull);
                if (isVoiceCall) {
                    var aiSpeechEl = document.getElementById('aiLiveAiSpeech');
                    if (aiSpeechEl) aiSpeechEl.textContent = 'AI: ' + currentFull;
                }
            });

            var finalText = (res && res.text) || streamedSoFar;
            var chunks = (res && res.audioChunks) || [];
            finalizeStreamingBubble(streamId, finalText, chunks);

            if (isVoiceCall) {
                updateVoiceCallStatus('speaking', 'AI কথা বলছে...', 'উত্তর শুনুন');
                var aiSpeechEl = document.getElementById('aiLiveAiSpeech');
                if (aiSpeechEl) aiSpeechEl.textContent = 'AI: ' + finalText;

                // Play AI Voice Reply Automatically
                playPcmAudio(chunks, streamId, null, function onAudioEnded() {
                    if (isVoiceCallActive) {
                        updateVoiceCallStatus('listening', 'আপনার কথা শুনছি...', 'বলুন, কিভাবে সাহায্য করতে পারি?');
                        startVoiceCallListening();
                    }
                });
            }
        } catch (err) {
            console.error('AI Chat Error:', err);
            if (streamedSoFar && streamedSoFar.trim().length > 5) {
                finalizeStreamingBubble(streamId, streamedSoFar, []);
            } else {
                removeElement(streamId);
                var errText = 'দুঃখিত! AI উত্তর দিতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।';
                appendMessage('assistant', errText, []);
                if (isVoiceCall) {
                    updateVoiceCallStatus('idle', 'ত্রুটি হয়েছে', err.message || 'আবার চেষ্টা করুন');
                }
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

    // ─── Voice Call Mode Handlers ──────────────────────────────────
    function updateVoiceCallStatus(state, title, desc) {
        var orb = document.getElementById('aiVoiceOrb');
        var titleEl = document.getElementById('aiVoiceStatusTitle');
        var descEl = document.getElementById('aiVoiceStatusDesc');
        var wavesEl = document.getElementById('aiVoiceWaves');
        var talkBtn = document.getElementById('aiVoiceTalkBtn');
        var talkBtnText = document.getElementById('aiVoiceTalkBtnText');

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

        if (talkBtn && talkBtnText) {
            if (state === 'listening') {
                talkBtn.classList.add('recording');
                talkBtnText.textContent = 'কথা শেষ / পাঠান';
            } else {
                talkBtn.classList.remove('recording');
                talkBtnText.textContent = '🎙️ কথা বলুন';
            }
        }
    }

    function animateWaveBars(volume) {
        for (var i = 1; i <= 5; i++) {
            var bar = document.getElementById('aiWaveBar' + i);
            if (bar) {
                var factor = (i === 3 ? 1.5 : (i === 2 || i === 4 ? 1.2 : 0.8));
                var h = Math.max(6, Math.min(38, Math.round(8 + volume * 40 * factor)));
                bar.style.height = h + 'px';
            }
        }
    }

    async function startVoiceCallListening() {
        if (!isVoiceCallActive) return;

        try {
            updateVoiceCallStatus('listening', 'আপনার কথা শুনছি...', 'পণ্য সম্পর্কে বলুন...');
            await MicEngine.start({
                onVolume: function (vol) {
                    animateWaveBars(vol);
                },
                onTranscript: function (transcript) {
                    var transcriptEl = document.getElementById('aiLiveUserSpeech');
                    if (transcriptEl && transcript) {
                        transcriptEl.textContent = 'আপনি: ' + transcript;
                    }
                }
            });
        } catch (err) {
            console.error('startVoiceCallListening err:', err);
            updateVoiceCallStatus('idle', 'মাইক্রোফোন ত্রুটি', err.message);
            alert(err.message);
        }
    }

    async function finishVoiceCallListeningAndSend() {
        var recorded = await MicEngine.stop();
        animateWaveBars(0);

        if (!recorded) return;

        var userQuery = (recorded.transcript || '').trim();
        var hasAudio = (recorded.base64 && recorded.base64.length > 0);

        if (!userQuery && !hasAudio) {
            updateVoiceCallStatus('listening', 'কোনো কথা শোনা যায়নি', 'অনুগ্রহ করে আবার বলুন...');
            startVoiceCallListening();
            return;
        }

        handleUserQuestion(userQuery, recorded, true);
    }

    function startVoiceCall() {
        initAiChat();
        var backdrop = document.getElementById('aiChatBackdrop');
        if (backdrop) backdrop.classList.add('active');

        var bubble = document.getElementById('aiFloatingBubble');
        if (bubble) bubble.classList.remove('show');

        isVoiceCallActive = true;

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

        startVoiceCallListening();
    }

    function endVoiceCall() {
        isVoiceCallActive = false;
        MicEngine.stop();

        if (activeAudioSource) {
            try { activeAudioSource.stop(); } catch(e){}
            activeAudioSource = null;
        }

        var headerBtn = document.getElementById('aiHeaderCallBtn');
        var headerBtnText = document.getElementById('aiHeaderCallBtnText');
        if (headerBtn) headerBtn.classList.remove('active-call');
        if (headerBtnText) headerBtnText.textContent = 'ভয়েস কল';

        showChatView();
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

    function toggleVoiceCallMic() {
        if (MicEngine.isRecording) {
            finishVoiceCallListeningAndSend();
        } else {
            startVoiceCallListening();
        }
    }

    // ─── Input Bar Microphone Dictation ────────────────────────────
    async function toggleInputDictation() {
        var btn = document.getElementById('aiDictateBtn');
        var input = document.getElementById('aiInputField');

        if (isDictating || MicEngine.isRecording) {
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';

            var recorded = await MicEngine.stop();
            if (!recorded) return;

            var userQuery = (recorded.transcript || '').trim();
            if (userQuery) {
                if (input) input.value = userQuery;
                handleUserQuestion(userQuery, null, false);
            } else if (recorded.base64) {
                // Send recorded audio directly
                if (input) input.value = '';
                handleUserQuestion('', recorded, false);
            }
            return;
        }

        try {
            isDictating = true;
            if (btn) btn.classList.add('recording');
            if (input) input.placeholder = '🎙️ কথা বলুন, শুনছি... (শেষ করতে আবার চাপুন)';

            await MicEngine.start({
                onTranscript: function (transcript) {
                    if (input && transcript) {
                        input.value = transcript;
                    }
                }
            });
        } catch (err) {
            isDictating = false;
            if (btn) btn.classList.remove('recording');
            if (input) input.placeholder = 'পণ্য সম্পর্কে প্রশ্ন লিখুন...';
            alert(err.message);
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
                appendMessage('assistant', 'হ্যালো! আমি আপনার স্মার্ট শপিং অ্যাসিস্ট্যান্ট। "' + (currentProduct.name || 'এই পণ্যটি') + '" সম্পর্কে যেকোনো প্রশ্ন করতে পারেন অথবা সরাসরি "📞 ভয়েস কল" বাটনে ক্লিক করে কথা বলতে পারেন।', []);
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
            MicEngine.stop();

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
            if (isVoiceCallActive) {
                endVoiceCall();
            }
            MicEngine.stop();

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
            handleUserQuestion(val, null, false);
        },

        sendChip: function (chipText) {
            handleUserQuestion(chipText, null, false);
        },

        toggleInputDictation: toggleInputDictation,
        startVoiceCall: startVoiceCall,
        endVoiceCall: endVoiceCall,
        toggleVoiceCall: toggleVoiceCall,
        toggleVoiceCallMic: toggleVoiceCallMic,
        showChatView: showChatView,

        playAudio: function (msgId, btnEl) {
            var chunks = audioChunksStore[msgId] || [];
            playPcmAudio(chunks, msgId, btnEl);
        }
    };

    window.ProductAiChat = ProductAiChat;
    window.openProductAiChat = function (prod) { ProductAiChat.open(prod); };

})(window);
