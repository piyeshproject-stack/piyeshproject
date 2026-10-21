/**
 * AI Configuration & Gemini API Client for E-Commerce
 * Google AI Studio Integration
 * Active Models:
 *  - gemini-3.8-live (Permanent Customer Chat & Live Audio Assistant)
 *  - gemini-2.5-flash-native-audio-preview-12-2025 (Dedicated Native Audio Dialog Fallback)
 *  - gemini-3.8-pro   (High Intelligence, Extended Thinking, Admin SEO & Descriptions)
 *  - gemini-3.8-flash (Fast Fallback)
 *  - gemini-2.5-flash (Standard Fallback)
 */

(function (window) {
    'use strict';

    var STORAGE_KEY_V2 = 'ecom_ai_settings_v2';
    var STORAGE_KEY_V1 = 'ecom_ai_settings_v1';
    var MODELS_CACHE_KEY = 'ecom_ai_cached_models_v2';

    // Canonical model endpoints specified by user
    var PERMANENT_USER_MODEL = 'gemini-3.8-live';
    var NATIVE_AUDIO_MODEL   = 'gemini-2.5-flash-native-audio-preview-12-2025';
    var SMART_ADMIN_MODEL    = 'gemini-3.8-pro';
    var FALLBACK_FLASH       = 'gemini-3.8-flash';
    var FALLBACK_25          = 'gemini-2.5-flash';
    var FALLBACK_LEGACY      = 'gemini-1.5-flash';

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

    /**
     * Clean and normalize model ID
     */
    function normalizeModelId(id) {
        if (!id) return PERMANENT_USER_MODEL;
        var clean = id.toString().toLowerCase().trim().replace(/^models\//, '');

        if (clean === 'gemini-3.8-live' || clean.includes('3.8-live')) return PERMANENT_USER_MODEL;
        if (clean.includes('native-audio') || clean.includes('native-audio-preview') || clean.includes('2.5-flash-native')) {
            return NATIVE_AUDIO_MODEL;
        }
        if (clean === 'gemini-3.8-pro' || clean.includes('3.8-pro') || clean.includes('3.8-live-extended')) return 'gemini-3.8-pro';
        if (clean === 'gemini-3.8-flash' || clean.includes('3.8-flash')) return PERMANENT_USER_MODEL;
        if (clean === 'gemini-2.5-flash' || clean.includes('2.5-flash')) return 'gemini-2.5-flash';
        if (clean === 'gemini-2.5-pro' || clean.includes('2.5-pro')) return 'gemini-2.5-pro';

        if (clean.includes('2.0')) return PERMANENT_USER_MODEL;

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

            // User Chat is permanently gemini-3.8-live for customer-facing features
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

            // Keep user model permanent
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

        getCachedModels: function () {
            try {
                var r = localStorage.getItem(MODELS_CACHE_KEY);
                if (r) return JSON.parse(r);
            } catch (e) {}
            return [];
        },

        setCachedModels: function (list) {
            try {
                if (Array.isArray(list) && list.length) {
                    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(list));
                }
            } catch (e) {}
        },

        /**
         * Test an API Key against Google AI Studio models endpoint.
         */
        testApiKey: async function (apiKey, testModel) {
            if (!apiKey || !apiKey.trim()) throw new Error('API Key is missing');
            apiKey = apiKey.trim();

            var listRes  = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey));
            var listData = await listRes.json();
            if (listData.error) throw new Error(listData.error.message || 'Invalid API Key');

            var available = (listData.models || []).map(function (m) { return m.name.replace(/^models\//, ''); });
            this.setCachedModels(available);

            var target = normalizeModelId(testModel || PERMANENT_USER_MODEL);
            if (!available.includes(target)) {
                target = available.find(function (m) { return m.includes('3.8-live') || m.includes('3.8') || m.includes('2.5'); }) || available[0] || PERMANENT_USER_MODEL;
            }

            var genRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + target + ':generateContent?key=' + encodeURIComponent(apiKey), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
            });
            var genData = await genRes.json();

            if (genData.error) return { success: true, warning: genData.error.message, models: available };
            return { success: true, models: available, activeModel: target };
        },

        /**
         * Ultra-Fast Streaming: Google Gemini SSE stream (/v1beta/models/{model}:streamGenerateContent?alt=sse)
         * Sends tokens as they are generated for sub-second first-token response!
         * Priority for User:
         * 1) gemini-3.8-live
         * 2) If audio or error, gemini-2.5-flash-native-audio-preview-12-2025
         * 3) gemini-3.8-flash, gemini-2.5-flash
         */
        streamText: async function (opts, onChunk) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            var contents = [];
            if (opts.history && Array.isArray(opts.history)) {
                opts.history.forEach(function (msg) {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.text || msg.content || '' }]
                    });
                });
            }

            // User parts (supports text prompt and/or audio inlineData)
            var userParts = [];
            if (opts.audioBase64) {
                userParts.push({
                    inlineData: {
                        mimeType: opts.audioMimeType || 'audio/webm',
                        data: opts.audioBase64
                    }
                });
            }
            if (opts.prompt) {
                userParts.push({ text: opts.prompt });
            }
            if (!userParts.length) userParts.push({ text: 'Hello' });

            contents.push({ role: 'user', parts: userParts });

            var payload = { contents: contents };
            if (opts.systemInstruction) {
                payload.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
            }
            payload.generationConfig = {
                temperature: opts.temperature !== undefined ? opts.temperature : 0.7,
                maxOutputTokens: opts.maxTokens || 1024
            };

            // Model Priority Selection:
            // For customer: gemini-3.8-live ALWAYS first!
            // If audio input or voice mode and 3.8-live fails: gemini-2.5-flash-native-audio-preview-12-2025!
            var tryModels = [];
            if (!opts.isAdmin) {
                tryModels = [PERMANENT_USER_MODEL, NATIVE_AUDIO_MODEL, FALLBACK_FLASH, FALLBACK_25, FALLBACK_LEGACY];
            } else {
                var chosenAdmin = normalizeModelId(opts.model || config.admin_model);
                tryModels = [chosenAdmin, SMART_ADMIN_MODEL, PERMANENT_USER_MODEL, FALLBACK_FLASH, FALLBACK_25];
            }

            // Remove duplicates
            tryModels = tryModels.filter(function (val, idx, arr) { return arr.indexOf(val) === idx; });

            var lastErr = null;
            for (var i = 0; i < tryModels.length; i++) {
                var m = tryModels[i];
                var sseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(apiKey);

                var controller = new AbortController();
                var timeoutId = setTimeout(function () { controller.abort(); }, 12000); // 12s timeout per model

                try {
                    var res = await fetch(sseUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!res.ok) {
                        var errJson = await res.json().catch(function () { return {}; });
                        var errMsg = (errJson.error && errJson.error.message) ? errJson.error.message : ('HTTP ' + res.status);
                        lastErr = errMsg;

                        // If 3.8-live cannot take audio or model not found, try fallback (native-audio or flash)
                        if (res.status === 404 ||
                            errMsg.includes('not found') ||
                            errMsg.includes('not supported') ||
                            errMsg.includes('no longer available') ||
                            errMsg.includes('deprecated') ||
                            errMsg.includes('modality') ||
                            errMsg.includes('audio')) {
                            continue;
                        }
                        throw new Error(errMsg);
                    }

                    if (!res.body || typeof res.body.getReader !== 'function') {
                        return await this.generateText(Object.assign({}, opts, { model: m, apiKey: apiKey }));
                    }

                    var reader = res.body.getReader();
                    var decoder = new TextDecoder('utf-8');
                    var fullText = '';
                    var buffer = '';

                    while (true) {
                        var chunkResult = await reader.read();
                        if (chunkResult.done) break;

                        buffer += decoder.decode(chunkResult.value, { stream: true });
                        var lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (var j = 0; j < lines.length; j++) {
                            var line = lines[j].trim();
                            if (!line || !line.startsWith('data:')) continue;
                            var jsonStr = line.slice(5).trim();
                            if (jsonStr === '[DONE]') continue;
                            try {
                                var parsed = JSON.parse(jsonStr);
                                var chunkText = '';
                                if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts) {
                                    chunkText = parsed.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
                                }
                                if (chunkText) {
                                    fullText += chunkText;
                                    if (typeof onChunk === 'function') onChunk(chunkText, fullText);
                                }
                            } catch (e) { /* skip partial chunk */ }
                        }
                    }

                    if (fullText) {
                        return { success: true, modelUsed: m, text: fullText };
                    }
                } catch (e) {
                    clearTimeout(timeoutId);
                    lastErr = e.message;
                    if (e.name === 'AbortError') lastErr = 'Request timed out for model ' + m;
                    if (i < tryModels.length - 1 && (
                        e.message.includes('not found') ||
                        e.message.includes('not supported') ||
                        e.message.includes('modality') ||
                        e.message.includes('audio') ||
                        e.message.includes('no longer available') ||
                        e.message.includes('deprecated') ||
                        e.name === 'AbortError'
                    )) {
                        continue;
                    }
                    if (i === tryModels.length - 1) throw e;
                }
            }

            throw new Error(lastErr || 'Gemini AI থেকে উত্তর পাওয়া যায়নি।');
        },

        /**
         * Non-streaming generateText (for admin tasks like SEO, description, tags)
         */
        generateText: async function (opts) {
            var config = this.getConfig();
            var apiKey = (opts.apiKey || (opts.isAdmin ? (config.admin_api_key || config.user_api_key) : (config.user_api_key || config.admin_api_key)) || '').trim();

            if (!apiKey) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। Admin Settings → AI Configuration থেকে API Key দিন।');
            }

            var contents = [];
            if (opts.history && Array.isArray(opts.history)) {
                opts.history.forEach(function (msg) {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.text || msg.content || '' }]
                    });
                });
            }

            var userParts = [];
            if (opts.audioBase64) {
                userParts.push({
                    inlineData: {
                        mimeType: opts.audioMimeType || 'audio/webm',
                        data: opts.audioBase64
                    }
                });
            }
            if (opts.prompt) {
                userParts.push({ text: opts.prompt });
            }
            if (!userParts.length) userParts.push({ text: 'Hello' });

            contents.push({ role: 'user', parts: userParts });

            var payload = { contents: contents };
            if (opts.systemInstruction) {
                payload.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
            }
            payload.generationConfig = {
                temperature: opts.temperature !== undefined ? opts.temperature : 0.7,
                maxOutputTokens: opts.maxTokens || 1024
            };

            var tryModels = [];
            if (!opts.isAdmin) {
                tryModels = [PERMANENT_USER_MODEL, NATIVE_AUDIO_MODEL, FALLBACK_FLASH, FALLBACK_25, FALLBACK_LEGACY];
            } else {
                var chosenAdmin = normalizeModelId(opts.model || config.admin_model);
                tryModels = [chosenAdmin, SMART_ADMIN_MODEL, PERMANENT_USER_MODEL, FALLBACK_FLASH, FALLBACK_25];
            }
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
                            lastErr.includes('modality') ||
                            lastErr.includes('audio') ||
                            lastErr.includes('no longer available') ||
                            lastErr.includes('deprecated')) {
                            continue;
                        }
                        throw new Error(lastErr);
                    }

                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        var text = data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
                        return { success: true, modelUsed: m, text: text };
                    }
                } catch (e) {
                    clearTimeout(timeoutId);
                    lastErr = e.message;
                    if (e.name === 'AbortError') lastErr = 'Request timed out for model ' + m;
                    if (i < tryModels.length - 1 && (
                        e.message.includes('not found') ||
                        e.message.includes('not supported') ||
                        e.message.includes('modality') ||
                        e.message.includes('audio') ||
                        e.message.includes('no longer available') ||
                        e.message.includes('deprecated') ||
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
