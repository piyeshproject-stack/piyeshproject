const fs = require('fs');
const files = ['index.html', 'shop.html', 'product.html', 'cart.html', 'checkout.html', 'track.html', 'profile.html', 'login.html', 'register.html', 'forgot-password.html'];
files.forEach(f => {
    try {
        let txt = fs.readFileSync(f, 'utf8');
        if (!txt.includes('theme.js')) {
            txt = txt.replace('</head>', '    <script src="assets/js/theme.js"></script>\n</head>');
        }
        if (txt.includes('function applySettings(s) {') && !txt.includes('if(window.applyTheme)')) {
            txt = txt.replace('function applySettings(s) {', 'function applySettings(s) {\n    if(window.applyTheme) applyTheme(s);');
        }
        fs.writeFileSync(f, txt);
    } catch(e) {}
});
console.log("Done");
