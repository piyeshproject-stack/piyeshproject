/**
 * AI Configuration & Gemini API Client for E-Commerce
 * Google AI Studio Integration
 * Marked Models:
 *  - Gemini 3 Flash Live
 *  - Gemini 3.8 Live
 *  - Gemini 3.8 Live Extended Thinking
 *  - Gemini 2.5 Flash Native Audio Dialog
 */

(function (window) {
    'use strict';

    var STORAGE_KEY = 'ecom_ai_settings_v1';

    // Model Definitions from Google AI Studio
    var AI_MODELS = {
        TEXT_USER: [
            { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live (Fast & Responsive)' },
            { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live (High Accuracy)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Standard Fallback)' }
        ],
        TEXT_ADMIN: [
            { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Live Extended Thinking (Deep Reasoning & SEO)' },
            { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live' },
            { id: 'gemini-3-flash-live', name: 'Gemini 3 Flash Live' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Fallback)' }
        ],
        AUDIO_MODELS: [
            { id: 'gemini-2.5-flash-native-audio-dialog', name: 'Gemini 2.5 Flash Native Audio Dialog (Live Voice Call)' }
        ]
    };

    var DEFAULT_CONFIG = {
        admin_api_key: '',
        admin_model: 'gemini-3.8-live-extended-thinking',
        user_api_key: '',
        user_model: 'gemini-3-flash-live',
        audio_model: 'gemini-2.5-flash-native-audio-dialog',
        enable_user_chat: true,
        enable_voice_call: true,
        enable_comparison: true
    };

    var AIConfig = {
        MODELS: AI_MODELS,

        // Load configuration from localStorage or merged with window.siteSettings
        getConfig: function () {
            var saved = {};
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (raw) saved = JSON.parse(raw);
            } catch (e) {
                console.warn('AIConfig: Failed to read localStorage', e);
            }

            // Also check DB siteSettings if present
            var dbSettings = window.siteSettings || window.shopSettings || {};
            if (dbSettings.ai_config) {
                try {
                    var parsed = typeof dbSettings.ai_config === 'string' ? JSON.parse(dbSettings.ai_config) : dbSettings.ai_config;
                    saved = Object.assign({}, parsed, saved);
                } catch (e) {}
            }

            return Object.assign({}, DEFAULT_CONFIG, saved);
        },

        saveConfig: function (cfg) {
            var current = this.getConfig();
            var merged = Object.assign({}, current, cfg);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {
                console.error('AIConfig: save error', e);
            }
            return merged;
        },

        // Test API Key using Google AI Studio endpoint
        testApiKey: async function (apiKey, testModel) {
            if (!apiKey || !apiKey.trim()) {
                throw new Error('API Key is missing');
            }
            apiKey = apiKey.trim();

            // First check model list
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

                // Pick a model to test generateContent
                var modelToTest = testModel || 'gemini-2.5-flash';
                // If model not directly listed, try fallback to first available or standard
                var hasTarget = availableModels.some(function (m) {
                    return m.toLowerCase().includes(modelToTest.toLowerCase());
                });

                var activeTestModel = hasTarget ? modelToTest : (availableModels[0] || 'gemini-2.5-flash');

                var testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + activeTestModel + ':generateContent?key=' + encodeURIComponent(apiKey);
                var genRes = await fetch(testUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: 'Hello, respond with: OK' }]
                        }]
                    })
                });
                var genData = await genRes.json();

                if (genData.error) {
                    // Even if specific model failed, if API key returned valid model list, key is good
                    return {
                        success: true,
                        warning: genData.error.message,
                        models: availableModels
                    };
                }

                return {
                    success: true,
                    models: availableModels,
                    activeModel: activeTestModel
                };
            } catch (err) {
                throw err;
            }
        },

        // Send content generation request to Gemini
        generateText: async function (opts) {
            var config = this.getConfig();
            var apiKey = opts.apiKey || (opts.isAdmin ? config.admin_api_key : config.user_api_key) || config.admin_api_key;
            var model = opts.model || (opts.isAdmin ? config.admin_model : config.user_model);

            if (!apiKey || !apiKey.trim()) {
                throw new Error('Google AI Studio API Key configured নেই। অনুগ্রহ করে Admin Settings থেকে AI Configuration সম্পন্ন করুন।');
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

            // Try primary model, fallback gracefully if not found
            var primaryModel = model || 'gemini-3-flash-live';
            var fallbackModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

            var tryModels = [primaryModel];
            fallbackModels.forEach(function(m){
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
                        // If model not found (404), try next fallback
                        if (res.status === 404 || (data.error.message && data.error.message.includes('not found'))) {
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
                    if (i === tryModels.length - 1) throw e;
                }
            }

            throw new Error(lastError || 'Failed to generate response from Gemini');
        }
    };

    window.AIConfig = AIConfig;
})(window);
