const fs = require('fs');
const path = require('path');

function walk(d) {
    fs.readdirSync(d).forEach(f => {
        let p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.html') && !p.includes('node_modules') && !p.includes('.gemini') && !p.includes('.git') && !p.includes('temp')) {
            let c = fs.readFileSync(p, 'utf8');
            let modified = false;
            if (!c.includes('theme.css?v=2')) {
                if (c.includes('<link rel="stylesheet" href="assets/css/admin.css">')) {
                    c = c.replace('<link rel="stylesheet" href="assets/css/admin.css">', '<link rel="stylesheet" href="assets/css/admin.css">\n    <link rel="stylesheet" href="../assets/css/theme.css?v=2">');
                    modified = true;
                } else if (c.includes('<link rel="stylesheet" href="assets/css/style.css">')) {
                    c = c.replace('<link rel="stylesheet" href="assets/css/style.css">', '<link rel="stylesheet" href="assets/css/style.css">\n    <link rel="stylesheet" href="assets/css/theme.css?v=2">');
                    modified = true;
                }
                
                if (modified) {
                    fs.writeFileSync(p, c);
                    console.log('Fixed ' + p);
                }
            }
        }
    });
}
walk('.');
