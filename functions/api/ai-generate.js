export async function onRequestPost(context) {
    const { request, env } = context;

    // Optional admin token check if configured
    const authHeader = request.headers.get('Authorization');
    if (env.ADMIN_SECRET_TOKEN && authHeader !== `Bearer ${env.ADMIN_SECRET_TOKEN}`) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { prompt, model: requestedModel } = body;

        if (!prompt) {
            return Response.json({ success: false, error: "Prompt is required." });
        }

        // 1. Resolve Gemini API Key & Model (Priority: Env Var -> D1 Settings DB)
        let geminiApiKey = (env.GEMINI_API_KEY || env.GOOGLE_AI_KEY || '').trim();
        let geminiModel  = requestedModel || 'gemini-3.8-pro';

        if (!geminiApiKey && env.DB) {
            try {
                const sRow = await env.DB.prepare("SELECT ai_config FROM settings WHERE id = 1").first();
                if (sRow && sRow.ai_config) {
                    const parsed = typeof sRow.ai_config === 'string' ? JSON.parse(sRow.ai_config) : sRow.ai_config;
                    geminiApiKey = (parsed.admin_api_key || parsed.user_api_key || '').trim();
                    if (parsed.admin_model && !requestedModel) {
                        geminiModel = parsed.admin_model;
                    }
                }
            } catch (dbErr) {
                console.warn('Could not read ai_config from DB:', dbErr);
            }
        }

        // 2. If Gemini Key is present, call Google Generative Language API
        if (geminiApiKey) {
            const tryModels = [
                geminiModel.replace(/^models\//, ''),
                'gemini-3.8-live',
                'gemini-3.8-pro',
                'gemini-3.8-flash',
                'gemini-2.5-flash-native-audio-preview-12-2025',
                'gemini-2.5-flash'
            ];
            // Remove duplicates
            const uniqueModels = [...new Set(tryModels)];

            let lastGeminiErr = null;
            for (const m of uniqueModels) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            systemInstruction: {
                                parts: [{
                                    text: "You are an expert e-commerce copywriter. Write a persuasive, SEO-friendly, and engaging product description based on the user's prompt. Write in Bengali (or English if requested). Format the output beautifully using HTML tags like <p>, <b>, <ul>, <li>, <br>. Do NOT include markdown backticks like ```html. Return only clean HTML markup."
                                }]
                            },
                            generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
                        })
                    });

                    const data = await res.json();
                    if (data.error) {
                        lastGeminiErr = data.error.message || 'Gemini error';
                        if (res.status === 404 || lastGeminiErr.includes('not found') || lastGeminiErr.includes('no longer available')) {
                            continue;
                        }
                        throw new Error(lastGeminiErr);
                    }

                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        const content = data.candidates[0].content.parts.map(p => p.text || '').join('');
                        return Response.json({ success: true, result: content, modelUsed: m });
                    }
                } catch (err) {
                    lastGeminiErr = err.message;
                    if (err.message.includes('not found') || err.message.includes('no longer available')) continue;
                    throw err;
                }
            }

            return Response.json({ success: false, error: lastGeminiErr || "Gemini AI generation failed." });
        }

        // 3. Fallback: GitHub Models API (if user still has GITHUB_TOKEN configured)
        if (env.GITHUB_TOKEN) {
            const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${env.GITHUB_TOKEN}`
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert e-commerce copywriter. Write a persuasive, SEO-friendly product description. Format output cleanly using HTML tags like <p>, <b>, <ul>, <li>. Return only clean HTML without markdown backticks."
                        },
                        { role: "user", content: prompt }
                    ],
                    model: "gpt-4o-mini",
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                return Response.json({ success: true, result: data.choices[0].message.content, modelUsed: 'github-gpt-4o-mini' });
            } else {
                return Response.json({ success: false, error: "AI failed to generate response.", details: data });
            }
        }

        return Response.json({
            success: false,
            error: "Google AI Studio API Key বা GITHUB_TOKEN পাওয়া যায়নি। অনুগ্রহ করে Admin Settings থেকে AI Key সেভ করুন।"
        });

    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
}
