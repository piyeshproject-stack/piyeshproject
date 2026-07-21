const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'api') walk(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('fetch((CONFIG.HF_API_BASE||"")+"/api/d1-query"')) {
                content = content.replace(/fetch\("\/api\/d1-query"/g, 'fetch((CONFIG.HF_API_BASE||"")+"/api/d1-query"');
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    });
}
walk('.');
