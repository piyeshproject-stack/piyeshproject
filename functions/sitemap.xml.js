export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    let siteUrl = url.origin;
    let products = [];
    let categories = [];

    if (env.DB) {
        try {
            const sRes = await env.DB.prepare("SELECT site_url FROM settings WHERE id = 1").first();
            if (sRes && sRes.site_url && sRes.site_url.trim()) {
                siteUrl = sRes.site_url.trim().replace(/\/+$/, '');
            } else if (env.SITE_URL && env.SITE_URL.trim()) {
                siteUrl = env.SITE_URL.trim().replace(/\/+$/, '');
            }

            const pRes = await env.DB.prepare("SELECT id, created_at FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1000").all();
            products = pRes.results || [];

            const cRes = await env.DB.prepare("SELECT id FROM categories WHERE is_active = 1").all();
            categories = cRes.results || [];
        } catch(e) {}
    }

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Site Pages -->
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/shop.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/policies.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${siteUrl}/team.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${siteUrl}/track.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;

    // Categories
    for (const cat of categories) {
        xml += `
  <url>
    <loc>${siteUrl}/shop.html?cat=${encodeURIComponent(cat.id)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Active Products
    for (const prod of products) {
        let prodDate = today;
        if (prod.created_at) {
            prodDate = prod.created_at.split(' ')[0].split('T')[0];
        }
        xml += `
  <url>
    <loc>${siteUrl}/product.html?id=${encodeURIComponent(prod.id)}</loc>
    <lastmod>${prodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    xml += `\n</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
