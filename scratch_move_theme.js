const fs = require('fs');

let settingsHTML = fs.readFileSync('admin/settings.html', 'utf8');

const themeStartIdx = settingsHTML.indexOf('<!-- Theme Settings -->');
const themeEndIdx = settingsHTML.indexOf('<!-- Social / Contact -->');

if (themeStartIdx !== -1 && themeEndIdx !== -1) {
    const themeUI = settingsHTML.substring(themeStartIdx, themeEndIdx);
    settingsHTML = settingsHTML.substring(0, themeStartIdx) + settingsHTML.substring(themeEndIdx);
    
    const jsStartIdx = settingsHTML.indexOf('// ── Theme Customizer Logic');
    const jsEndIdx = settingsHTML.lastIndexOf('</script>');
    let themeJS = "";
    if (jsStartIdx !== -1 && jsEndIdx !== -1) {
        themeJS = settingsHTML.substring(jsStartIdx, jsEndIdx);
        settingsHTML = settingsHTML.substring(0, jsStartIdx) + settingsHTML.substring(jsEndIdx);
    }
    
    // Also remove color-thief from head of settings.html
    settingsHTML = settingsHTML.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>\n', '');

    fs.writeFileSync('admin/settings.html', settingsHTML);
    
    // Create admin/theme.html
    let template = fs.readFileSync('admin/tracking.html', 'utf8');
    
    // Add color-thief to head
    template = template.replace('</head>', '    <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"></script>\n</head>');
    
    // Set title
    template = template.replace('<title>Tracking Config — Admin Panel</title>', '<title>Theme Customizer — Admin Panel</title>');
    template = template.replace('<div class="page-title">Tracking Configuration</div>', '<div class="page-title">Theme Customizer</div>');
    template = template.replace('<div class="page-subtitle">Platform tracking codes</div>', '<div class="page-subtitle">Store branding & colors</div>');
    
    // Replace Header right button
    template = template.replace(
        /<button class="btn btn-primary" onclick="saveTrackingConfig\(\)">💾 Save Tracking Config<\/button>/, 
        ''
    );
    
    // Replace Content
    const contentStart = template.indexOf('<div class="settings-grid">');
    const contentEnd = template.indexOf('</main>');
    
    const newContent = `<div class="settings-grid" style="display:block; max-width:800px; margin:0 auto;">
${themeUI}
        </div>
    `;
    
    template = template.substring(0, contentStart) + newContent + template.substring(contentEnd);
    
    // Replace Script
    const trackingJsStart = template.indexOf('document.addEventListener(\'DOMContentLoaded\'');
    const templateScriptEnd = template.lastIndexOf('</script>');
    
    const newScript = `
    document.addEventListener('DOMContentLoaded', function() {
        adminInit('theme');
        // Pre-fill fields if we can fetch current theme or let them start fresh
        // The old css variables are already loaded via theme.css anyway!
        // We can just rely on the inputs default values or try to parse the actual CSS if we wanted to.
    });

${themeJS}
`;
    template = template.substring(0, trackingJsStart) + newScript + template.substring(templateScriptEnd);

    fs.writeFileSync('admin/theme.html', template);
    console.log("Migration successful");
} else {
    console.log("Could not find theme UI block");
}
