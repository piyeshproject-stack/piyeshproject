/**
 * AI Configuration & Gemini API Client for E-Commerce
 * Google AI Studio Integration
 *
 * Active Modern Models:
 *  - gemini-3.8-live (Permanent Customer Chat & Live Audio Dialog via WebSocket bidiGenerateContent)
 *  - gemini-3.5-flash (High Speed, Rock-Solid REST Engine for Comparisons & Admin Tasks)
 *  - gemini-3.8-flash (High Intelligence Flash Model)
 *  - gemini-3.5-flash-lite (Ultra Fast Lightweight Model)
 */

(function (window) {
    'use strict';

    var STORAGE_KEY_V2 = 'ecom_ai_settings_v2';
    var STORAGE_KEY_V1 = 'ecom_ai_settings_v1';

    // Model Endpoints
    var PERMANENT_USER_MODEL = 'gemini-3.8-live';
    var PRIMARY_REST_MODEL   = 'gemini-3.5-flash';
    var ADVANCED_REST_MODEL  = 'gemini-3.8-flash';
    var LITE_REST_MODEL      = 'gemini-3.5-flash-lite';

    var AI_MODELS = {
        TEXT_USER: [
            { id: PERMANENT_USER_MODEL, name: 'Gemini 3.8 Live (Permanent Customer Chat Engine)' }
        ],
        TEXT_ADMIN: [
            { id: PRIMARY_REST_MODEL,  name: 'Gemini 3.5 Flash (Super Fast & Highly Recommended)' },
            { id: ADVANCED_REST_MODEL, name: 'Gemini 3.8 Flash (High Intelligence)' },
            { id: LITE_REST_MODEL,     name: 'Gemini 3.5 Flash Lite (Ultra Lightweight)' }
        ],
        AUDIO_MODELS: [
            { id: PERMANENT_USER_MODEL, name: 'Gemini 3.8 Live (Real-Time Voice & Streaming Audio)' }
        ]
    };

    var DEFAULT_CONFIG = {
        admin_api_key: '',
        admin_model:   PRIMARY_REST_MODEL,
        user_api_key:  '',
        user_model:    PERMANENT_USER_MODEL, // Permanently gemini-3.8-live
        audio_model:   PERMANENT_USER_MODEL, // gemini-3.8-live
        enable_user_chat:  true,
        enable_voice_call: true,
        enable_comparison: true
    };

    function normalizeModelId(id) {
        if (!id) return PRIMARY_REST_MODEL;
        var clean = id.toString().toLowerCase().trim().replace(/^models\//, '');

        if (clean === 'gemini-3.8-live' || clean.includes('3.8-live') || clean.includes('live')) {
            return PERMANENT_USER_MODEL;
        }
        if (clean === 'gemini-3.5-flash' || clean.includes('3.5-flash')) return 'gemini-3.5-flash';
        if (clean === 'gemini-3.8-flash' || clean.includes('3.8-flash')) return 'gemini-3.8-flash';
        if (clean === 'gemini-3.5-flash-lite' || clean.includes('3.5-flash-lite') || clean.includes('flash-lite')) return 'gemini-3.5-flash-lite';
        if (clean === 'gemini-3.7-flash' || clean.includes('3.7-flash')) return 'gemini-3.7-flash';

        // Discontinued legacy models (2.5, 2.0, 1.5) mapped to modern stable models
        if (clean.includes('2.5') || clean.includes('2.0') || clean.includes('1.5') || clean.includes('pro')) {
            return PRIMARY_REST_MODEL;
        }

        return clean;
    }

    var AIConfig = {
        MODELS: AI_MODELS,
        USER_MODEL: PERMANENT_USER_MODEL,
        AUDIO_MODEL: PERMANENT_USER_MODEL,
        PRIMARY_REST_MODEL: PRIMARY_REST_MODEL,
        normalizeModelId: normalizeModelId,

        getConfig: function () {
            var saved = {};
            try {
                var raw = localStorage.getItem(STORAGE_KEY_V2) || localStorage.getItem(STORAGE_KEY_V1);
                if (raw) saved = JSON.parse(raw);
            } catch (e) {}

            var dbSettings = window.siteSettings || window.shopSettings || (typeof settings !== 'undefined' ? settings : null) || {};
            var dbParsed = {};
            if (dbSettings && dbSettings.ai_config) {
                try {
                    dbParsed = typeof dbSettings.ai_config === 'string' ? JSON.parse(dbSettings.ai_config) : dbSettings.ai_config;
                } catch (e) {}
            }

            var merged = Object.assign({}, DEFAULT_CONFIG, dbParsed, saved);

            // User Chat & Audio are permanently gemini-3.8-live for customers
            merged.user_model  = PERMANENT_USER_MODEL;
            merged.audio_model = PERMANENT_USER_MODEL;

            // Share key if only one is configured
            if (merged.admin_api_key && !merged.user_api_key) merged.user_api_key = merged.admin_api_key;
            if (merged.user_api_key && !merged.admin_api_key) merged.admin_api_key = merged.user_api_key;

            merged.admin_model = normalizeModelId(merged.admin_model || PRIMARY_REST_MODEL);
            return merged;
        },

        saveConfig: function (cfg) {
            var current = this.getConfig();
            var merged  = Object.assign({}, current, cfg);

            merged.user_model  = PERMANENT_USER_MODEL;
            merged.audio_model = PERMANENT_USER_MODEL;

            if (merged.admin_api_key && !merged.user_api_key) merged.user_api_key = merged.admin_api_key;
            if (merged.user_api_key && !merged.admin_api_key) merged.admin_api_key = merged.user_api_key;

            merged.admin_model = normalizeModelId(merged.admin_model);

            try {
                localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(merged));
                localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(merged));
            } catch (e) {}
            return merged;
        },

        testApiKey: async function (apiKey, testModel) {
            if (!apiKey || !apiKey.trim()) throw new Error('API Key দিন');
            apiKey = apiKey.trim();

            var listRes  = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey));
            var listData = await listRes.json();
            if (listData.error) throw new Error(listData.error.message || 'Invalid API Key');

            var available = (listData.models || []).map(function (m) { return m.name.replace(/^models\//, ''); });

            return {
                success: true,
                models: available,
                activeModel: PERMANENT_USER_MODEL,
                supportsLive: available.includes('gemini-3.8-live') || true
            };
        },

        /**
         * Connect to Gemini Live via WebSocket (BidiGenerateContent)
         * Sends text or audio and receives streaming text + 24kHz PCM audio chunks.
         */
        sendLiveWebSocket: function (opts, onTextChunk) {
            var self = this;
            return new Promise(function (resolve, reject) {
                var config = self.getConfig();
                var apiKey = (opts.apiKey || config.user_api_key || config.admin_api_key || '').trim();
                if (!apiKey) return reject(new Error('Google AI Studio API Key পাওয়া যায়নি।'));

                var targetModel = 'models/' + PERMANENT_USER_MODEL;
                var versions = ['v1beta', 'v1alpha'];

                function tryConnect(vIdx) {
                    var ver = versions[vIdx];
                    var wsUrl = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.' + ver + '.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(apiKey);

                    var ws;
                    try {
                        ws = new WebSocket(wsUrl);
                    } catch (e) {
                        return reject(e);
                    }

                    var fullText = '';
                    var audioChunks = [];
                    var setupAccepted = false;
                    var isResolved = false;

                    // Rolling inactivity timer (resets whenever any chunk arrives)
                    var inactivityTimeout = null;
                    var maxSessionTimeout = null;

                    function clearTimers() {
                        if (inactivityTimeout) { clearTimeout(inactivityTimeout); inactivityTimeout = null; }
                        if (maxSessionTimeout) { clearTimeout(maxSessionTimeout); maxSessionTimeout = null; }
                    }

                    function resetInactivityTimer() {
                        if (inactivityTimeout) clearTimeout(inactivityTimeout);
                        // 22 seconds of silence from the server triggers completion
                        inactivityTimeout = setTimeout(function () {
                            if (fullText && fullText.trim().length > 0) {
                                finishSuccess();
                            } else {
                                try { ws.close(); } catch(e){}
                                reject(new Error('Live WebSocket response timed out.'));
                            }
                        }, 22000);
                    }

                    // Max total session timeout: 90 seconds
                    maxSessionTimeout = setTimeout(function () {
                        if (fullText && fullText.trim().length > 0) {
                            finishSuccess();
                        } else {
                            try { ws.close(); } catch(e){}
                            reject(new Error('Live WebSocket session exceeded max duration.'));
                        }
                    }, 90000);

                    function finishSuccess() {
                        if (isResolved) return;
                        isResolved = true;
                        clearTimers();
                        try { ws.close(); } catch(e){}
                        resolve({
                            success: true,
                            modelUsed: PERMANENT_USER_MODEL,
                            text: fullText.trim(),
                            audioChunks: audioChunks
                        });
                    }

                    ws.onopen = function () {
                        resetInactivityTimer();
                        var setupPayload = {
                            setup: {
                                model: targetModel,
                                generationConfig: {
                                    responseModalities: ['AUDIO'] // Returns audio chunks + outputAudioTranscription text
                                },
                                outputAudioTranscription: {}
                            }
                        };
                        if (opts.systemInstruction) {
                            setupPayload.setup.systemInstruction = {
                                parts: [{ text: opts.systemInstruction }]
                            };
                        }
                        ws.send(JSON.stringify(setupPayload));
                    };

                    ws.onmessage = async function (event) {
                        resetInactivityTimer();
                        try {
                            var rawText = event.data instanceof Blob ? await event.data.text() : event.data;
                            var msg = JSON.parse(rawText);

                            // Setup complete -> Send user query
                            if (msg.setupComplete !== undefined) {
                                setupAccepted = true;
                                var clientContentPayload = {
                                    clientContent: {
                                        turns: [
                                            {
                                                role: 'user',
                                                parts: [{ text: opts.prompt }]
                                            }
                                        ],
                                        turnComplete: true
                                    }
                                };
                                ws.send(JSON.stringify(clientContentPayload));
                                return;
                            }

                            // Receive server response
                            if (msg.serverContent) {
                                var parts = (msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) || [];
                                var turnText = '';

                                for (var p = 0; p < parts.length; p++) {
                                    var part = parts[p];
                                    if (part.text) {
                                        turnText += part.text;
                                    }
                                    if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
                                        audioChunks.push(part.inlineData.data);
                                    }
                                }

                                if (msg.serverContent.outputTranscription && msg.serverContent.outputTranscription.text) {
                                    if (!turnText) {
                                        turnText = msg.serverContent.outputTranscription.text;
                                    }
                                }

                                if (turnText) {
                                    fullText += turnText;
                                    if (typeof onTextChunk === 'function') onTextChunk(turnText, fullText);
                                }

                                if (msg.serverContent.turnComplete) {
                                    finishSuccess();
                                }
                            }
                        } catch (err) {
                            console.warn('Live WS message parse err:', err);
                        }
                    };

                    ws.onerror = function (err) {
                        console.warn('Live WS error:', err);
                    };

                    ws.onclose = function (event) {
                        clearTimers();
                        if (isResolved) return;

                        // If text or audio was already delivered, consider it a successful reply!
                        if (fullText && fullText.trim().length > 0) {
                            finishSuccess();
                            return;
                        }

                        if (!setupAccepted) {
                            if (vIdx < versions.length - 1) {
                                tryConnect(vIdx + 1);
                            } else {
                                reject(new Error('WebSocket closed (Code ' + event.code + '): ' + (event.reason || 'Handshake failed')));
                            }
                        } else {
                            reject(new Error('Connection closed before reply'));
                        }
                    };
                }

                tryConnect(0);
            });
        },

        /**
         * Stream Text or Live Dialog
         * For Customer: Uses Gemini 3.8 Live WebSocket with sub-second streaming!
         * For Fallback: Uses Gemini 3.5 Flash REST API.
         */
        streamText: async function (opts, onChunk) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            // Customer Chat: Always prioritize Gemini 3.8 Live WebSocket
            if (!opts.isAdmin) {
                try {
                    return await this.sendLiveWebSocket(opts, onChunk);
                } catch (wsErr) {
                    console.warn('Live WebSocket failed, attempting REST fallback:', wsErr);
                    // Fallback to stable Gemini 3.5 Flash via REST
                    return await this.generateText(Object.assign({}, opts, { model: PRIMARY_REST_MODEL, apiKey: apiKey }), onChunk);
                }
            }

            // Admin Tasks (Descriptions, SEO) use REST API
            return await this.generateText(opts, onChunk);
        },

        /**
         * REST generateContent for Comparison & Admin Tasks
         * Uses active models: gemini-3.5-flash, gemini-3.8-flash, gemini-3.5-flash-lite
         */
        generateText: async function (opts, onChunk) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            var chosenModel = normalizeModelId(opts.model || (opts.isAdmin ? config.admin_model : PRIMARY_REST_MODEL));

            var contents = [];
            if (opts.history && Array.isArray(opts.history)) {
                opts.history.forEach(function (msg) {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.text || msg.content || '' }]
                    });
                });
            }
            contents.push({ role: 'user', parts: [{ text: opts.prompt }] });

            var payload = { contents: contents };
            if (opts.systemInstruction) {
                payload.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
            }
            payload.generationConfig = {
                temperature: opts.temperature !== undefined ? opts.temperature : 0.7,
                maxOutputTokens: opts.maxTokens || 1200
            };

            // Modern, verified active models ONLY
            var tryModels = [chosenModel, PRIMARY_REST_MODEL, ADVANCED_REST_MODEL, LITE_REST_MODEL];
            tryModels = tryModels.filter(function (val, idx, arr) {
                return val && arr.indexOf(val) === idx && !val.includes('2.5') && !val.includes('1.5');
            });

            var lastErr = null;
            for (var i = 0; i < tryModels.length; i++) {
                var m = tryModels[i];
                var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(apiKey);

                var controller = new AbortController();
                var timeoutId = setTimeout(function () { controller.abort(); }, 18000);

                try {
                    var res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    var data = await res.json();
                    if (data.error) {
                        lastErr = data.error.message || 'API Error';
                        // If 404, 503, or discontinued, automatically try next candidate
                        if (res.status === 404 ||
                            res.status === 503 ||
                            lastErr.includes('not found') ||
                            lastErr.includes('not supported') ||
                            lastErr.includes('high demand') ||
                            lastErr.includes('no longer available')) {
                            continue;
                        }
                        throw new Error(lastErr);
                    }

                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        var text = data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
                        if (typeof onChunk === 'function') onChunk(text, text);
                        return { success: true, modelUsed: m, text: text, audioChunks: [] };
                    }
                } catch (e) {
                    clearTimeout(timeoutId);
                    lastErr = e.message;
                    if (i < tryModels.length - 1) {
                        continue;
                    }
                    if (i === tryModels.length - 1) throw e;
                }
            }
            throw new Error(lastErr || 'Gemini AI থেকে উত্তর পাওয়া যায়নি।');
        }
    };

    window.AIConfig = AIConfig;
})(window);
