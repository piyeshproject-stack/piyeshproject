const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Replace fetch logic
content = content.replace(
    `window.supabase.from('banners').select('*').order('display_order', { ascending: true }).then(function(res) {
        if (res.data) renderHero(res.data);
    }).catch(console.error);`,
    `window.supabase.from('banners').select('*').order('display_order', { ascending: true }).then(function(res) {
        if (res.data) {
            if (window.THEME_LAYOUT && window.THEME_LAYOUT.hero === 'v2') {
                renderHeroV2(res.data);
            } else {
                renderHero(res.data);
            }
        }
    }).catch(console.error);`
);

// Inject renderHeroV2
const v2Code = `
    if (banners.length > 1) startSlider(banners.length);
}

function renderHeroV2(banners) {
    var section = document.getElementById('heroSection');
    if (!banners.length) { section.style.display = 'none'; return; }

    var slidesHtml = banners.map(function(b) {
        var rawLink = (b.link_url || '').trim();
        var linkData = null;
        if (rawLink.startsWith('{') && rawLink.endsWith('}')) {
            try { linkData = JSON.parse(rawLink); } catch(e){}
        }

        var fullUrl = rawLink;
        var isArea = false;
        if (linkData) {
            fullUrl = linkData.url || '';
            isArea = linkData.type === 'area';
        }

        if (fullUrl && !fullUrl.startsWith('http') && !fullUrl.startsWith('/') && !fullUrl.startsWith('.')) fullUrl = 'https://' + fullUrl;

        var slideInner = '<img src="' + b.image_url + '" alt="' + (b.title||'Banner') + '" loading="lazy" style="width:100%; height:auto; display:block; object-fit:contain; border-radius:var(--radius-lg);">';

        if (isArea && fullUrl) {
            var areaStyle = 'position:absolute;top:'+linkData.y+'%;left:'+linkData.x+'%;width:'+linkData.w+'%;height:'+linkData.h+'%;z-index:20;display:block;';
            slideInner += '<a href="' + fullUrl + '" style="' + areaStyle + '"></a>';
        } else if (fullUrl) {
            var areaStyle = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;display:block;';
            slideInner += '<a href="' + fullUrl + '" style="' + areaStyle + '"></a>';
        }

        return '<div class="slide" style="position:relative; min-width:100%; flex-shrink:0; background:transparent;">' + slideInner + '</div>';
    }).join('');

    var dotsHtml = banners.map(function(b, i) {
        return '<div class="dot' + (i===0?' active':'') + '" onclick="goSlide(' + i + ')"></div>';
    }).join('');

    section.innerHTML =
        '<div class="hero-slider" style="background:transparent; box-shadow:none; overflow:hidden; position:relative; margin-top:0;">' +
            '<div class="slider-track" id="sliderTrack" style="display:flex; transition: transform 0.5s ease;">' + slidesHtml + '</div>' +
            (banners.length > 1 ? '<button class="slider-btn slider-prev" onclick="prevSlide()">‹</button><button class="slider-btn slider-next" onclick="nextSlide()">›</button><div class="slider-dots" style="bottom:12px;">' + dotsHtml + '</div>' : '') +
        '</div>';

    if (banners.length > 1) startSlider(banners.length);
}`;

content = content.replace('    if (banners.length > 1) startSlider(banners.length);\r\n}', v2Code);
content = content.replace('    if (banners.length > 1) startSlider(banners.length);\n}', v2Code);

fs.writeFileSync('index.html', content);
console.log('Done!');
