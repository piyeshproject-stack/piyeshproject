/**
 * AI Configuration & Gemini API Client for E-Commerce
 * Google AI Studio Integration
 * Active Models:
 *  - gemini-3.8-live (Permanent Customer Chat & Live Audio Engine via BidiGenerateContent WebSocket)
 *  - gemini-2.5-flash-native-audio-preview-12-2025 (Dedicated Native Audio Dialog Fallback)
 *  - gemini-3.8-pro   (High Intelligence, Extended Thinking, Admin SEO & Descriptions)
 *  - gemini-3.8-flash (High Speed Fallback)
 *  - gemini-2.5-flash (Standard Fallback)
 */

(function (window) {
    'use strict';

    var STORAGE_KEY_V2 = 'ecom_ai_settings_v2';
    var STORAGE_KEY_V1 = 'ecom_ai_settings_v1';
    var MODELS_CACHE_KEY = 'ecom_ai_cached_models_v2';

    // Model Endpoints
    var PERMANENT_USER_MODEL = 'gemini-3.8-live';
    var NATIVE_AUDIO_MODEL   = 'gemini-2.5-flash-native-audio-preview-12-2025';
    var SMART_ADMIN_MODEL    = 'gemini-3.8-pro';
    var FALLBACK_FLASH       = 'gemini-3.8-flash';
    var FALLBACK_25          = 'gemini-2.5-flash';

    var AI_MODELS = {
        TEXT_USER: [
            { id: PERMANENT_USER_MODEL, name: 'Gemini 3.8 Live (Permanent Customer Chat Engine)' }
        ],
        TEXT_ADMIN: [
            { id: SMART_ADMIN_MODEL,  name: 'Gemini 3.8 Pro (Extended Thinking - Best for Descriptions & SEO)' },
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (High Speed & Intelligence)' },
            { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro (Standard Pro)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fallback)' }
        ],
        AUDIO_MODELS: [
            { id: PERMANENT_USER_MODEL, name: 'Gemini 3.8 Live (Primary Voice Dialog)' },
            { id: NATIVE_AUDIO_MODEL,   name: 'Gemini 2.5 Flash Native Audio Preview (Dedicated Audio Fallback)' }
        ]
    };

    var DEFAULT_CONFIG = {
        admin_api_key: '',
        admin_model:   SMART_ADMIN_MODEL,
        user_api_key:  '',
        user_model:    PERMANENT_USER_MODEL, // Permanently gemini-3.8-live
        audio_model:   NATIVE_AUDIO_MODEL,   // gemini-2.5-flash-native-audio-preview-12-2025
        enable_user_chat:  true,
        enable_voice_call: true,
        enable_comparison: true
    };

    function normalizeModelId(id) {
        if (!id) return PERMANENT_USER_MODEL;
        var clean = id.toString().toLowerCase().trim().replace(/^models\//, '');

        if (clean === 'gemini-3.8-live' || clean.includes('3.8-live')) return PERMANENT_USER_MODEL;
        if (clean.includes('native-audio') || clean.includes('native-audio-preview') || clean.includes('2.5-flash-native')) {
            return NATIVE_AUDIO_MODEL;
        }
        if (clean === 'gemini-3.8-pro' || clean.includes('3.8-pro') || clean.includes('3.8-live-extended')) return 'gemini-3.8-pro';
        if (clean === 'gemini-3.8-flash' || clean.includes('3.8-flash')) return 'gemini-3.8-flash';
        if (clean === 'gemini-2.5-flash' || clean.includes('2.5-flash')) return 'gemini-2.5-flash';
        if (clean === 'gemini-2.5-pro' || clean.includes('2.5-pro')) return 'gemini-2.5-pro';

        if (clean.includes('2.0') || clean.includes('1.5')) return PERMANENT_USER_MODEL;

        return clean;
    }

    var AIConfig = {
        MODELS: AI_MODELS,
        USER_MODEL: PERMANENT_USER_MODEL,
        AUDIO_MODEL: NATIVE_AUDIO_MODEL,
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

            // User Chat is permanently gemini-3.8-live for customers
            merged.user_model  = PERMANENT_USER_MODEL;
            merged.audio_model = NATIVE_AUDIO_MODEL;

            // Share key if only one is configured
            if (merged.admin_api_key && !merged.user_api_key) merged.user_api_key = merged.admin_api_key;
            if (merged.user_api_key && !merged.admin_api_key) merged.admin_api_key = merged.user_api_key;

            merged.admin_model = normalizeModelId(merged.admin_model || SMART_ADMIN_MODEL);
            return merged;
        },

        saveConfig: function (cfg) {
            var current = this.getConfig();
            var merged  = Object.assign({}, current, cfg);

            merged.user_model  = PERMANENT_USER_MODEL;
            merged.audio_model = NATIVE_AUDIO_MODEL;

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
            if (!apiKey || !apiKey.trim()) throw new Error('API Key is missing');
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

                var targetModel = 'models/' + (opts.model || PERMANENT_USER_MODEL).replace(/^models\//, '');
                var versions = ['v1beta', 'v1alpha'];

                function tryConnect(vIdx, modelEndpoint) {
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
                    var hasTimedOut = false;

                    var timeoutId = setTimeout(function () {
                        hasTimedOut = true;
                        try { ws.close(); } catch (e) {}
                        if (modelEndpoint !== 'models/' + NATIVE_AUDIO_MODEL) {
                            tryConnect(0, 'models/' + NATIVE_AUDIO_MODEL);
                        } else {
                            reject(new Error('Live WebSocket connection timed out'));
                        }
                    }, 14000);

                    ws.onopen = function () {
                        var setupPayload = {
                            setup: {
                                model: modelEndpoint,
                                generationConfig: {
                                    responseModalities: ['AUDIO'] // Returns audio + outputAudioTranscription
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
                        try {
                            var rawText = event.data instanceof Blob ? await event.data.text() : event.data;
                            var msg = JSON.parse(rawText);

                            // Setup complete -> Send user turn
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
                                for (var p = 0; p < parts.length; p++) {
                                    var part = parts[p];
                                    if (part.text) {
                                        fullText += part.text;
                                        if (typeof onTextChunk === 'function') onTextChunk(part.text, fullText);
                                    }
                                    if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
                                        audioChunks.push(part.inlineData.data);
                                    }
                                }

                                if (msg.serverContent.outputTranscription && msg.serverContent.outputTranscription.text) {
                                    var tText = msg.serverContent.outputTranscription.text;
                                    fullText += tText;
                                    if (typeof onTextChunk === 'function') onTextChunk(tText, fullText);
                                }

                                if (msg.serverContent.turnComplete) {
                                    clearTimeout(timeoutId);
                                    try { ws.close(); } catch(e){}
                                    resolve({
                                        success: true,
                                        modelUsed: modelEndpoint.replace(/^models\//, ''),
                                        text: fullText,
                                        audioChunks: audioChunks
                                    });
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
                        clearTimeout(timeoutId);
                        if (hasTimedOut) return;

                        if (!setupAccepted) {
                            if (vIdx < versions.length - 1) {
                                tryConnect(vIdx + 1, modelEndpoint);
                            } else if (modelEndpoint !== 'models/' + NATIVE_AUDIO_MODEL) {
                                tryConnect(0, 'models/' + NATIVE_AUDIO_MODEL);
                            } else {
                                reject(new Error('WebSocket closed (Code ' + event.code + '): ' + (event.reason || 'Handshake failed')));
                            }
                        } else if (!fullText && !audioChunks.length) {
                            reject(new Error('Connection closed before reply'));
                        }
                    };
                }

                tryConnect(0, targetModel);
            });
        },

        /**
         * Stream Text or Live Dialog
         * For Customer: Uses Gemini 3.8 Live WebSocket with sub-second response!
         * For Admin: Uses REST generateContent with gemini-3.8-pro / gemini-3.8-flash.
         */
        streamText: async function (opts, onChunk) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            // Customer Chat: Always use Gemini 3.8 Live via Bidi WebSocket!
            if (!opts.isAdmin) {
                try {
                    return await this.sendLiveWebSocket(opts, onChunk);
                } catch (wsErr) {
                    console.warn('Live WebSocket failed, attempting REST fallback:', wsErr);
                    // Fallback to REST only if WebSocket is unavailable on network
                    return await this.generateText(Object.assign({}, opts, { model: FALLBACK_FLASH, apiKey: apiKey }), onChunk);
                }
            }

            // Admin Tasks (Descriptions, SEO) use REST API
            return await this.generateText(opts, onChunk);
        },

        /**
         * REST generateContent for Admin Tasks (SEO, Description Generator)
         */
        generateText: async function (opts, onChunk) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            var chosenModel = normalizeModelId(opts.model || (opts.isAdmin ? config.admin_model : FALLBACK_FLASH));

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

            var tryModels = [chosenModel, SMART_ADMIN_MODEL, FALLBACK_FLASH, FALLBACK_25];
            tryModels = tryModels.filter(function (val, idx, arr) { return arr.indexOf(val) === idx; });

            var lastErr = null;
            for (var i = 0; i < tryModels.length; i++) {
                var m = tryModels[i];
                var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(apiKey);

                var controller = new AbortController();
                var timeoutId = setTimeout(function () { controller.abort(); }, 15000);

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
                        if (res.status === 404 ||
                            lastErr.includes('not found') ||
                            lastErr.includes('not supported') ||
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
                    if (i < tryModels.length - 1 && (
                        e.message.includes('not found') ||
                        e.message.includes('not supported') ||
                        e.message.includes('no longer available') ||
                        e.name === 'AbortError'
                    )) {
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
