export async function onRequestGet(context) {
    const { request, env } = context;
    if (!env.DB) return Response.json({ success: false, error: "Database not configured" });

    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id");
    const limit = url.searchParams.get("limit") || "100";

    if (!productId) return Response.json({ success: false, error: "Missing product_id" });

    try {
        const stmt = env.DB.prepare("SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT ?").bind(productId, parseInt(limit));
        const results = await stmt.all();

        return new Response(JSON.stringify({ success: true, data: results.results || [] }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
                // Caching is 100% controlled by Cloudflare Dashboard Cache Rules per domain (no hardcoded Cache-Control)
            }
        });
    } catch(e) {
        return Response.json({ success: false, error: e.message });
    }
}
