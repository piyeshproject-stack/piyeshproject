export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    let siteUrl = url.origin;
    if (env.DB) {
        try {
            const sRes = await env.DB.prepare("SELECT site_url FROM settings WHERE id = 1").first();
            if (sRes && sRes.site_url && sRes.site_url.trim()) {
                siteUrl = sRes.site_url.trim().replace(/\/+$/, '');
            } else if (env.SITE_URL && env.SITE_URL.trim()) {
                siteUrl = env.SITE_URL.trim().replace(/\/+$/, '');
            }
        } catch(e) {}
    }
    if (siteUrl && !siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
        siteUrl = 'https://' + siteUrl;
    }

    const txt = `User-agent: *
Allow: /
Allow: /index.html
Allow: /shop.html
Allow: /product.html
Allow: /policies.html
Allow: /team.html
Allow: /track.html

Allow: /api/public-data
Allow: /api/public-reviews
Allow: /api/get-products-list

Disallow: /admin/
Disallow: /cart.html
Disallow: /checkout.html
Disallow: /invoice.html
Disallow: /success.html
Disallow: /login.html
Disallow: /register.html
Disallow: /forgot-password.html
Disallow: /fraud-chack.html

Sitemap: ${siteUrl}/sitemap.xml
`;

    return new Response(txt, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300'
        }
    });
}
