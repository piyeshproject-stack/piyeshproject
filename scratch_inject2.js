const fs = require('fs');
const files = ['index.html', 'shop.html', 'product.html', 'cart.html', 'checkout.html', 'track.html', 'profile.html', 'login.html', 'register.html', 'forgot-password.html'];

files.forEach(f => {
    try {
        let txt = fs.readFileSync(f, 'utf8');
        
        // Remove dynamic JS theme
        txt = txt.replace('    <script src="assets/js/theme.js"></script>\n', '');
        
        // Remove applyTheme call
        if (txt.includes('if(window.applyTheme) applyTheme(s);')) {
            txt = txt.replace('if(window.applyTheme) applyTheme(s);', '');
        }

        // Add static CSS theme
        if (!txt.includes('theme.css')) {
            txt = txt.replace('<link rel="stylesheet" href="assets/css/style.css">', 
                              '<link rel="stylesheet" href="assets/css/style.css">\n    <link rel="stylesheet" href="assets/css/theme.css">');
        }
        
        fs.writeFileSync(f, txt);
    } catch(e) { console.error(e) }
});
