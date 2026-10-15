export async function onRequestGet(context) {
    const { request, env } = context;
    try {
        const rootRequest = new Request(new URL('/', request.url), request);
        const assetRes = await env.ASSETS.fetch(rootRequest);
        const text = await assetRes.text();
        return new Response(`status: ${assetRes.status}, length: ${text.length}, hasProducts: ${text.includes('productsGrid')}`, {
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch(e) {
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}
