// Template V2 Rendering Engine (Tailwind Based)

function renderHeroV2(banners) {
    var section = document.getElementById('heroSection');
    if (!banners || !banners.length) {
        banners = [{
            image_url: 'https://images.unsplash.com/photo-1618220179428-22790b46a0eb?auto=format&fit=crop&w=1920&q=80',
            title: 'Demo Banner',
            link_url: ''
        }];
    }

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

        var inner = '<img src="' + b.image_url + '" alt="' + (b.title||'') + '" class="w-full h-full object-cover pointer-events-none">';
        
        if (isArea && fullUrl) {
            var areaStyle = 'position:absolute;top:'+linkData.y+'%;left:'+linkData.x+'%;width:'+linkData.w+'%;height:'+linkData.h+'%;z-index:20;display:block;';
            inner += '<a href="' + fullUrl + '" style="' + areaStyle + '"></a>';
        } else if (fullUrl) {
            var areaStyle = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;display:block;';
            inner += '<a href="' + fullUrl + '" style="' + areaStyle + '"></a>';
        }

        return '<div class="min-w-full h-full relative flex-shrink-0 slide-v2">' + inner + '</div>';
    }).join('');

    var dotsHtml = banners.map(function(b, i) {
        return '<button class="slider-dot-v2 w-2 h-2 md:w-3 md:h-3 rounded-full ' + (i===0 ? 'bg-primary' : 'bg-transparent') + ' border-2 border-primary transition-colors cursor-pointer" data-index="'+i+'"></button>';
    }).join('');

    section.innerHTML = `
    <div class="relative w-full h-[220px] sm:h-[350px] md:h-[450px] lg:h-[550px] overflow-hidden group select-none bg-gray-50 mb-8 rounded-lg">
        <div id="sliderTrackV2" class="flex transition-transform duration-500 ease-in-out h-full w-full cursor-grab active:cursor-grabbing">
            ${slidesHtml}
        </div>
        ${banners.length > 1 ? `
        <button onclick="prevSlideV2()" class="absolute left-2 md:left-8 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-primary w-8 h-8 md:w-12 md:h-12 rounded-full flex justify-center items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 shadow-md z-20 cursor-pointer">
            <i class="fa-solid fa-chevron-left text-sm md:text-xl"></i>
        </button>
        <button onclick="nextSlideV2()" class="absolute right-2 md:right-8 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-primary w-8 h-8 md:w-12 md:h-12 rounded-full flex justify-center items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 shadow-md z-20 cursor-pointer">
            <i class="fa-solid fa-chevron-right text-sm md:text-xl"></i>
        </button>
        <div class="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 md:gap-3 z-20">
            ${dotsHtml}
        </div>
        ` : ''}
    </div>`;

    if (banners.length > 1) {
        window.slideIdxV2 = 0;
        window.slideTotalV2 = banners.length;
        window.startSliderV2();
    }
    section.style.display = 'block';
}

window.slideIdxV2 = 0;
window.slideTotalV2 = 0;
window.slideTimerV2 = null;

function updateSliderV2() {
    var track = document.getElementById('sliderTrackV2');
    if (track) track.style.transform = 'translateX(-' + (window.slideIdxV2 * 100) + '%)';
    document.querySelectorAll('.slider-dot-v2').forEach(function(d, i) {
        if (i === window.slideIdxV2) {
            d.classList.add('bg-primary');
            d.classList.remove('bg-transparent');
        } else {
            d.classList.remove('bg-primary');
            d.classList.add('bg-transparent');
        }
    });
}
function nextSlideV2() {
    window.slideIdxV2 = (window.slideIdxV2 + 1) % window.slideTotalV2;
    updateSliderV2();
}
function prevSlideV2() {
    window.slideIdxV2 = (window.slideIdxV2 - 1 + window.slideTotalV2) % window.slideTotalV2;
    updateSliderV2();
}
function startSliderV2() {
    clearInterval(window.slideTimerV2);
    window.slideTimerV2 = setInterval(nextSlideV2, 4000);
}

// ── V2 Home Sections ────────────────────────────────────────────────
// The user's code had Featured Products and Latest Products.
// In v1, it's rendered generically via renderHomeSections(homeSects).
// We will override renderHomeSectionsV2.

function renderHomeSectionsV2(homeSects) {
    var container = document.getElementById('homeSectionsContainer');
    if (!container) return;
    
    // Sort by order
    var sorted = homeSects.filter(function(s) { return s.is_active !== false; }).sort(function(a, b) { return (a.display_order||0) - (b.display_order||0); });
    
    var html = '';
    sorted.forEach(function(sect) {
        var sectProds = allProducts.filter(function(p) { return p.category_ids && p.category_ids.includes(sect.category_id); });
        if (!sectProds.length) return;
        
        var prodsHtml = sectProds.slice(0, 8).map(function(p, i) {
            var img = (p.gallery_images && p.gallery_images[0]) || 'assets/images/placeholder.jpg';
            var price = parseFloat(p.price||0).toFixed(2);
            var strike = '';
            if (p.compare_price > p.price) strike = '<span class="text-primary font-lato line-through hidden sm:inline">$' + parseFloat(p.compare_price).toFixed(2) + '</span>';
            
            // Alternating active style for demo (like screenshot's active card)
            var activeClass = (i === 1) ? 'bg-hover-blue text-white' : 'bg-white';
            var titleColor = (i === 1) ? 'text-white' : 'text-primary';
            var priceColor = (i === 1) ? 'text-white' : 'text-secondary';
            var codeColor = (i === 1) ? 'text-white' : 'text-secondary';
            var dots = (i === 1) ? '<span class="w-2 h-1 md:w-3 md:h-1 bg-[#05E6B7] rounded"></span><span class="w-2 h-1 md:w-3 md:h-1 bg-primary rounded"></span><span class="w-2 h-1 md:w-3 md:h-1 bg-white rounded"></span>' : '<span class="w-2 h-1 md:w-3 md:h-1 bg-[#05E6B7] rounded"></span><span class="w-2 h-1 md:w-3 md:h-1 bg-primary rounded"></span><span class="w-2 h-1 md:w-3 md:h-1 bg-blue-700 rounded"></span>';

            return `
            <a href="product.html?id=${p.id}" class="product-card-hover group shadow-[0_0_15px_rgba(0,0,0,0.1)] rounded transition-all duration-300 relative block">
                <div class="bg-gray-100 relative h-[150px] md:h-[250px] flex justify-center items-center overflow-hidden p-2 md:p-4">
                    <img src="${img}" alt="${p.name}" class="h-4/5 object-contain group-hover:scale-110 transition duration-300 mix-blend-multiply">
                    <div class="hover-icons absolute top-2 left-2 md:top-3 md:left-3 flex md:flex-row flex-col gap-1 md:gap-2">
                        <div class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white text-blue-900 flex justify-center items-center hover:bg-gray-200"><i class="fa-solid fa-cart-shopping text-[10px] md:text-sm"></i></div>
                        <div class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white text-blue-900 flex justify-center items-center hover:bg-gray-200"><i class="fa-regular fa-heart text-[10px] md:text-sm"></i></div>
                    </div>
                    <div class="hover-icons absolute bottom-2 md:bottom-4 bg-green-500 text-white text-[10px] md:text-xs font-josefin py-1 md:py-2 px-2 md:px-4 rounded w-[90%] md:w-[120px] text-center">View Details</div>
                </div>
                <div class="card-bottom p-3 md:p-5 text-center transition-colors duration-300 ${activeClass}">
                    <h3 class="font-josefin font-bold text-[12px] md:text-lg ${titleColor} mb-1 md:mb-2 truncate">${p.name}</h3>
                    <div class="flex justify-center gap-1 mb-1 md:mb-3">${dots}</div>
                    <p class="text-[10px] md:text-sm ${codeColor} font-josefin mb-1 md:mb-2">Code - ${p.id.substring(0,6)}</p>
                    <span class="${priceColor} font-lato text-[12px] md:text-base">$${price}</span>
                </div>
            </a>`;
        }).join('');

        html += `
        <section class="py-10 md:py-16">
            <h2 class="text-xl md:text-4xl font-bold font-josefin text-center mb-6 md:mb-12 text-secondary">${sect.title}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8">
                ${prodsHtml}
            </div>
        </section>`;
    });
    
    container.innerHTML = html;
}
