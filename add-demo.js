const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const target = "    if (!banners.length) { section.style.display = 'none'; return; }";
const replacement = `    // Fallback to beautiful DEMO item if no banners exist in database
    if (!banners || !banners.length) {
        banners = [{
            image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200&h=500',
            title: 'New Furniture Collection Trends in 2026',
            link_url: ''
        }];
        section.style.display = 'block';
    } else if (!banners.length) {
        section.style.display = 'none'; return;
    }`;

// Only replace inside renderHeroV2
let parts = content.split('function renderHeroV2(banners) {');
if (parts.length === 2) {
    parts[1] = parts[1].replace(target, replacement);
    content = parts[0] + 'function renderHeroV2(banners) {' + parts[1];
    fs.writeFileSync('index.html', content);
    console.log('Dummy data added to v2!');
} else {
    console.log('Could not find renderHeroV2 function');
}
