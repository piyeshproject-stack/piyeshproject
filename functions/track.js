export async function onRequestGet(context) {
    const { request, env } = context;
    let response;
    try {
        const pageRequest = new Request(new URL('/track', request.url), request);
        response = await env.ASSETS.fetch(pageRequest);
        if (!env.DB) return response;

        const settings = await env.DB.prepare("SELECT store_name, site_url FROM settings WHERE id = 1").first();
        const storeName = settings?.store_name || "Store";
        let rawOrigin = (settings?.site_url || env.SITE_URL || new URL(request.url).origin).trim().replace(/\/+$/, '');
        if (rawOrigin && !rawOrigin.startsWith('http://') && !rawOrigin.startsWith('https://')) rawOrigin = 'https://' + rawOrigin;
        const canonicalUrl = `${rawOrigin}/track`;

        const transformed = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(`Track Your Order — ${storeName}`); } })
            .on('a[href]', {
                element(e) {
                    const href = e.getAttribute('href');
                    if (!href) return;
                    if (href === 'index.html' || href === '/index.html') e.setAttribute('href', '/');
                    else if (href.startsWith('shop.html')) e.setAttribute('href', '/shop' + href.slice('shop.html'.length));
                    else if (href === 'policies.html' || href === '/policies.html') e.setAttribute('href', '/policies');
                    else if (href === 'team.html' || href === '/team.html') e.setAttribute('href', '/team');
                    else if (href === 'track.html' || href === '/track.html') e.setAttribute('href', '/track');
                }
            })
            .on('head', {
                element(e) {
                    e.append(`\n    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">\n`, { html: true });
                }
            })
            .transform(response);
        const headers = new Headers(transformed.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(transformed.body, { status: transformed.status, headers });
    } catch (e) {
        return response || new Response('Internal Server Error', { status: 500 });
    }
}

