const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env, ctx) {
        // Handle CORS Preflight (OPTIONS)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }

        // Only allow GET requests
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json'
                }
            });
        }

        try {
            // Query the D1 database binding named DB
            const stmt = env.DB.prepare('SELECT * FROM products WHERE is_active = 1');
            const { results } = await stmt.all();

            return new Response(JSON.stringify({ success: true, data: results }), {
                status: 200,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/json'
                }
            });
        }
    }
};
