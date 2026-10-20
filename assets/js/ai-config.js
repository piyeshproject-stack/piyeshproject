/**
 * AI Configuration & Gemini API Client for E-Commerce
 * Google AI Studio Integration
 * Marked Models & Supported IDs:
 *  - Gemini 3.8 Flash / Gemini 3.8 Live (gemini-3.8-flash)
 *  - Gemini 3.8 Pro / Live Extended Thinking (gemini-3.8-pro)
 *  - Gemini 3 Flash (gemini-3-flash / gemini-3.8-flash)
 *  - Gemini 2.5 Flash Native Audio Dialog (gemini-2.5-flash-native-audio-dialog)
 */

(function (window) {
    'use strict';

    var STORAGE_KEY = 'ecom_ai_settings_v1';
    var MODELS_CACHE_KEY = 'ecom_ai_cached_models_v1';

    // Model Definitions matching Google AI Studio Documentation
    var AI_MODELS = {
        TEXT_USER: [
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Google Recommendation)' },
            { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (High Accuracy)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast Fallback)' }
        ],
        TEXT_ADMIN: [
            { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Live Extended Thinking / Pro (Deep Reasoning & SEO)' },
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash / Live (Fast & High Capability)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Fallback)' }
        ],
        AUDIO_MODELS: [
            { id: 'gemini-2.5-flash-native-audio-dialog', name: 'Gemini 2.5 Flash Native Audio Dialog (Live Voice Call)' }
        ]
    };

    var DEFAULT_CONFIG = {
        admin_api_key: '',
        admin_model: 'gemini-3.8-pro',
        user_api_key: '',
        user_model: 'gemini-3.8-flash',
        audio_model: 'gemini-2.5-flash-native-audio-dialog',
        enable_user_chat: true,
        enable_voice_call: true,
        enable_comparison: true
    };

    // Normalize any legacy or "Live" alias to the actual REST API model name
    function normalizeModelId(id) {
        if (!id) return 'gemini-3.8-flash';
        var clean = id.toLowerCase().trim().replace(/^models\//, '');
        if (clean === 'gemini-3.8-live-extended-thinking' || clean === 'gemini-3.8-pro') return 'gemini-3.8-pro';
        if (clean === 'gemini-3.8-live' || clean === 'gemini-3.8-flash') return 'gemini-3.8-flash';
        if (clean === 'gemini-3-flash-live' || clean === 'gemini-3-flash') return 'gemini-3.8-flash';
        if (clean === 'gemini-2.5-flash-native-audio-dialog') return 'gemini-2.5-flash';
        // Intercept any obsolete or deprecated 2.0 / 1.5 models and upgrade them
        if (clean.includes('2.0') || clean.includes('1.5')) return 'gemini-3.8-flash';
        return clean;
    }

    var AIConfig = {
        MODELS: AI_MODELS,
        normalizeModelId: normalizeModelId,

        // Load configuration from localStorage or merged with window.siteSettings
        getConfig: function () {
            var saved = {};
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (raw) saved = JSON.parse(raw);
            } catch (e) {
                console.warn('AIConfig: Failed to read localStorage', e);
            }

            // Also check DB siteSettings / shopSettings if present
            var dbSettings = window.siteSettings || window.shopSettings || (typeof settings !== 'undefined' ? settings : null) || {};
            var dbParsed = {};
            if (dbSettings && dbSettings.ai_config) {
                try {
                    dbParsed = typeof dbSettings.ai_config === 'string' ? JSON.parse(dbSettings.ai_config) : dbSettings.ai_config;
                } catch (e) {}
            }

            var merged = Object.assign({}, DEFAULT_CONFIG, dbParsed, saved);
            if (!merged.user_api_key && dbParsed.user_api_key) merged.user_api_key = dbParsed.user_api_key;
            if (!merged.admin_api_key && dbParsed.admin_api_key) merged.admin_api_key = dbParsed.admin_api_key;

            merged.admin_model = normalizeModelId(merged.admin_model);
            merged.user_model = normalizeModelId(merged.user_model);
            return merged;
        },

        saveConfig: function (cfg) {
            var current = this.getConfig();
            var merged = Object.assign({}, current, cfg);
            merged.admin_model = normalizeModelId(merged.admin_model);
            merged.user_model = normalizeModelId(merged.user_model);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {
                console.error('AIConfig: save error', e);
            }
            return merged;
        },

        getCachedModels: function () {
            try {
                var raw = localStorage.getItem(MODELS_CACHE_KEY);
                if (raw) return JSON.parse(raw);
            } catch(e){}
            return [];
        },

        setCachedModels: function (modelsList) {
            try {
                if (Array.isArray(modelsList) && modelsList.length) {
                    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(modelsList));
                }
            } catch(e){}
        },

        // Test API Key using Google AI Studio endpoint
        testApiKey: async function (apiKey, testModel) {
            if (!apiKey || !apiKey.trim()) {
                throw new Error('API Key is missing');
            }
            apiKey = apiKey.trim();

            try {
                var listUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
                var listRes = await fetch(listUrl);
                var listData = await listRes.json();

                if (listData.error) {
                    throw new Error(listData.error.message || 'Invalid API Key');
                }

                var availableModels = (listData.models || []).map(function (m) {
                    return m.name.replace('models/', '');
                });

                this.setCachedModels(availableModels);

                // Determine active test model
                var targetModel = normalizeModelId(testModel) || 'gemini-3.8-flash';
                if (!availableModels.includes(targetModel)) {
                    var bestMatch = availableModels.find(function(m){ return m.includes('3.8-flash'); }) ||
                                    availableModels.find(function(m){ return m.includes('3.8'); }) ||
                                    availableModels.find(function(m){ return m.includes('2.5-flash'); }) ||
                                    availableModels[0];
                    if (bestMatch) targetModel = bestMatch;
                }

                var testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + targetModel + ':generateContent?key=' + encodeURIComponent(apiKey);
                var genRes = await fetch(testUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: 'Respond with: OK' }]
                        }]
                    })
                });
                var genData = await genRes.json();

                if (genData.error) {
                    return {
                        success: true,
                        warning: genData.error.message,
                        models: availableModels
                    };
                }

                return {
                    success: true,
                    models: availableModels,
                    activeModel: targetModel
                };
            } catch (err) {
                throw err;
            }
        },

        // Send content generation request to Gemini
        generateText: async function (opts) {
            var config = this.getConfig();
            var apiKey = opts.apiKey || (opts.isAdmin ? config.admin_api_key : config.user_api_key) || config.admin_api_key;
            var chosenModel = normalizeModelId(opts.model || (opts.isAdmin ? config.admin_model : config.user_model));

            if (!apiKey || !apiKey.trim()) {
                throw new Error('Google AI Studio API Key পাওয়া যায়নি। অনুগ্রহ করে Admin Settings থেকে AI Configuration এ API Key দিন।');
            }

            var contents = [];

            // Add history if present
            if (opts.history && Array.isArray(opts.history)) {
                opts.history.forEach(function (msg) {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.text || msg.content }]
                    });
                });
            }

            // Current user message
            contents.push({
                role: 'user',
                parts: [{ text: opts.prompt }]
            });

            var payload = {
                contents: contents
            };

            if (opts.systemInstruction) {
                payload.systemInstruction = {
                    parts: [{ text: opts.systemInstruction }]
                };
            }

            // Prioritize modern Google recommended models (2026 current lineup)
            // NEVER include deprecated models like gemini-2.0-flash or gemini-1.5-flash
            var cachedModels = this.getCachedModels();
            var tryModels = [];

            if (chosenModel) tryModels.push(chosenModel);

            var standardPriorities = ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-2.5-flash', 'gemini-2.5-pro'];

            // If we have cached available models from Google, prioritize what is confirmed active
            if (cachedModels && cachedModels.length) {
                cachedModels.forEach(function(m) {
                    if (m.includes('3.8-flash') && !tryModels.includes(m)) tryModels.push(m);
                    if (m.includes('3.8-pro') && !tryModels.includes(m)) tryModels.push(m);
                    if (m.includes('2.5-flash') && !tryModels.includes(m)) tryModels.push(m);
                });
            }

            standardPriorities.forEach(function(m){
                if (!tryModels.includes(m)) tryModels.push(m);
            });

            var lastError = null;

            for (var i = 0; i < tryModels.length; i++) {
                var targetModel = tryModels[i];
                var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + targetModel + ':generateContent?key=' + encodeURIComponent(apiKey.trim());

                try {
                    var res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    var data = await res.json();
                    if (data.error) {
                        lastError = data.error.message || 'API Error';
                        // If model is not found (404) or deprecated, continue to next modern model
                        if (res.status === 404 ||
                            (data.error.message && (
                                data.error.message.includes('not found') ||
                                data.error.message.includes('no longer available') ||
                                data.error.message.includes('deprecated')
                            ))) {
                            continue;
                        }
                        throw new Error(data.error.message);
                    }

                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        var textParts = data.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
                        return {
                            success: true,
                            modelUsed: targetModel,
                            text: textParts
                        };
                    }
                } catch (e) {
                    lastError = e.message;
                    // If it was a model availability issue and we have more models to try, continue
                    if (i < tryModels.length - 1 && (
                        e.message.includes('not found') ||
                        e.message.includes('no longer available') ||
                        e.message.includes('deprecated')
                    )) {
                        continue;
                    }
                    if (i === tryModels.length - 1) throw e;
                }
            }

            throw new Error(lastError || 'Failed to generate response from Gemini');
        }
    };

    window.AIConfig = AIConfig;
})(window);
