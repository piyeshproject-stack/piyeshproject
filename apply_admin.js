const fs = require('fs');

const files = [
  'admin/addons.html', 'admin/banners.html', 'admin/categories.html', 'admin/dashboard.html',
  'admin/delivery.html', 'admin/devtools.html', 'admin/index.html', 'admin/orders.html',
  'admin/products.html', 'admin/promos.html', 'admin/reviews.html', 'admin/sections.html',
  'admin/settings.html', 'admin/assets/js/admin-common.js'
];

function convertSupabaseToCfDb(supabaseCode, indent) {
    let lines = supabaseCode.split('\n');
    let cfdb = [];
    let i = indent + '    ';

    if (supabaseCode.includes('return supabaseClient;')) {
        return i + 'return { is_cfdb: true, url: "https://your-render-api.com/api" };';
    }

    if (supabaseCode.includes('.auth.getSession()')) {
        return i + 'sessionPromise = fetch("https://your-render-api.com/api/auth/session", { headers: { "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } }).then(r=>r.json()).then(d=>d.session?d.session:null).catch(()=>null);';
    }
    if (supabaseCode.includes('.auth.signOut()')) {
        return i + 'fetch("https://your-render-api.com/api/auth/logout", { method: "POST", headers: { "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } }).then(()=>window.location.href="index.html").catch(()=>window.location.href="index.html");';
    }
    if (supabaseCode.includes('.auth.signInWithPassword')) {
        return i + 'res = await fetch("https://your-render-api.com/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify({email, password: pass}) }).then(r=>r.json());';
    }
    if (supabaseCode.includes('.auth.signUp')) {
        return i + 'res2 = await fetch("https://your-render-api.com/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify({email, password: pass}) }).then(r=>r.json());';
    }
    if (supabaseCode.includes('.auth.signInWithOAuth') || supabaseCode.includes('.auth.signInWithWeb3')) {
        return i + 'const res = await fetch("https://your-render-api.com/api/auth/provider", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } }).then(r=>r.json());';
    }

    // Promise assignments like p1 = supabaseClient...
    if (supabaseCode.includes('p1 = ') || supabaseCode.includes('Promise.all')) {
         let code = supabaseCode;
         code = code.replace(/p1 = supabaseClient\.from\('([^']+)'\)[^;]+;/g, 'p1 = fetch("https://your-render-api.com/api/$1", {headers:{"Authorization":"Bearer "+(localStorage.getItem("admin_token")||"")}}).then(r=>r.json()).then(d=>({data:d})).catch(()=>({data:[]}));');
         code = code.replace(/p2 = supabaseClient\.from\('([^']+)'\)[^;]+;/g, 'p2 = fetch("https://your-render-api.com/api/$1", {headers:{"Authorization":"Bearer "+(localStorage.getItem("admin_token")||"")}}).then(r=>r.json()).then(d=>({data:d})).catch(()=>({data:[]}));');
         code = code.replace(/p3 = supabaseClient\.from\('([^']+)'\)[^;]+;/g, 'p3 = fetch("https://your-render-api.com/api/$1", {headers:{"Authorization":"Bearer "+(localStorage.getItem("admin_token")||"")}}).then(r=>r.json()).then(d=>({data:d})).catch(()=>({data:[]}));');
         
         // Multi Promise
         let multiProm = code.match(/Promise\.all\(\[\s*([\s\S]+?)\s*\]\)\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
         if (multiProm) {
             let endpoints = multiProm[1].match(/from\('([^']+)'\)/g).map(s => s.replace(/from\('|'\)/g, ''));
             let fetches = endpoints.map(ep => 'fetch("https://your-render-api.com/api/' + ep + '", {headers:{"Authorization": "Bearer " + (localStorage.getItem("admin_token") || "")}}).then(r=>r.json()).then(d=>({data:d, error:null}))');
             let repl = 'Promise.all([' + fetches.join(', ') + ']).then(function(' + multiProm[2] + ') {\n' +
                    multiProm[3].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
                    i + '}).catch(function(err) { console.error(err); });';
             code = code.replace(multiProm[0], repl);
         }
         return code.split('\n').map(l => i + l.trim()).join('\n');
    }

    // var req = editingId ? update : insert
    let reqMatch = supabaseCode.match(/var req = ([a-zA-Z0-9_]+) \? supabaseClient\.from\('([^']+)'\)\.update\(([^)]+)\)\.eq\('[^']+',\s*([a-zA-Z0-9_]+)\) : supabaseClient\.from\('[^']+'\)\.insert\(\[([^\]]+)\]\);\s*req\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (reqMatch) {
        return i + 'var url = ' + reqMatch[1] + ' ? "https://your-render-api.com/api/' + reqMatch[2] + '/" + ' + reqMatch[1] + ' : "https://your-render-api.com/api/' + reqMatch[2] + '";\n' +
               i + 'var method = ' + reqMatch[1] + ' ? "PATCH" : "POST";\n' +
               i + 'fetch(url, { method: method, headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify(' + reqMatch[3] + ') })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + reqMatch[6] + ' = { data: data, error: data.error || null };\n' +
               reqMatch[7].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { showToast("Error: " + err.message, "error"); });';
    }

    // delete
    let delMatch = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.delete\(\)\.eq\('[^']+',\s*([^)]+)\)\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (delMatch) {
        return i + 'fetch("https://your-render-api.com/api/' + delMatch[1] + '/" + ' + delMatch[2] + ', { method: "DELETE", headers: { "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + delMatch[3] + ' = { data: data, error: null };\n' +
               delMatch[4].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { showToast("Delete error: " + err.message, "error"); });';
    }
    let simpleDelMatch = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.delete\(\)/);
    if (simpleDelMatch && !delMatch) {
        return i + 'fetch("https://your-render-api.com/api/' + simpleDelMatch[1] + '", { method: "DELETE", headers: { "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } }).then(r=>r.json());';
    }

    // Single Update
    let updMatch = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.update\(([^)]+)\)\.eq\('[^']+',\s*([^)]+)\)\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (updMatch) {
        return i + 'fetch("https://your-render-api.com/api/' + updMatch[1] + '/" + ' + updMatch[3] + ', { method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify(' + updMatch[2] + ') })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + updMatch[4] + ' = { data: data, error: null };\n' +
               updMatch[5].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { showToast("Update error: " + err.message, "error"); });';
    }

    // UPSERT settings
    let upstMatch = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.upsert\(\[([^\]]+)\]\)\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (upstMatch) {
         return i + 'fetch("https://your-render-api.com/api/' + upstMatch[1] + '", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify(' + upstMatch[2] + ') })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + upstMatch[3] + ' = { data: data, error: null };\n' +
               upstMatch[4].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { showToast("Save error: " + err.message, "error"); });';
    }

    // Single Select
    let selMatch = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.select\([^)]*\)[a-zA-Z0-9_.'(),\s{}:]*?\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (selMatch) {
        return i + 'fetch("https://your-render-api.com/api/' + selMatch[1] + '", { headers: { "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") } })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + selMatch[2] + ' = { data: data, count: Array.isArray(data)?data.length:0, error: null };\n' +
               selMatch[3].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { console.error(err); });';
    }

    // Products page specific multi-line update/insert block
    let prodReqMatch = supabaseCode.match(/var req = editingProductId\s*\?\s*supabaseClient\.from\('([^']+)'\)\.update\(([^)]+)\)\.eq\('[^']+',\s*editingProductId\)\s*:\s*supabaseClient\.from\('[^']+'\)\.insert\(\[([^\]]+)\]\)\.select\(\);\s*req\.then\(function\(([^)]+)\)\s*\{([\s\S]+?)\}\);/);
    if (prodReqMatch) {
        return i + 'var url = editingProductId ? "https://your-render-api.com/api/' + prodReqMatch[1] + '/" + editingProductId : "https://your-render-api.com/api/' + prodReqMatch[1] + '";\n' +
               i + 'var method = editingProductId ? "PATCH" : "POST";\n' +
               i + 'fetch(url, { method: method, headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify(' + prodReqMatch[2] + ') })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               i + '    var ' + prodReqMatch[4] + ' = { data: Array.isArray(data)?data:[data], error: data.error || null };\n' +
               prodReqMatch[5].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { showToast("Error: " + err.message, "error"); });';
    }
    
    // Product categories insert block
    let prodCatInsert = supabaseCode.match(/supabaseClient\.from\('([^']+)'\)\.insert\(([^)]+)\)\.then\(function\(([^)]*)\)\s*\{([\s\S]+?)\}\);/);
    if (prodCatInsert) {
        return i + 'fetch("https://your-render-api.com/api/' + prodCatInsert[1] + '", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (localStorage.getItem("admin_token") || "") }, body: JSON.stringify(' + prodCatInsert[2] + ') })\n' +
               i + '.then(res=>res.json()).then(function(data) {\n' +
               prodCatInsert[4].split('\n').map(l => i + '    ' + l.trim()).join('\n') + '\n' +
               i + '}).catch(function(err) { console.error(err); });';
    }

    // Default fallback
    return i + '// CF_DB MANUAL BLOCK NEEDED\n' + i + 'console.log("Implement cf_db for this block");\n' + i + supabaseCode.replace(/\n/g, '\n' + i);
}

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Find the supabase block and the appwrite block.
    // The Appwrite block could end with `} else {` or just `}` (with EOF or something else following).
    // The easiest way is to use a positive lookahead to match until `} else {` or `\n}`.
    let regex = /(if\s*\(CONFIG\.DB_PROVIDER === 'supabase'\)\s*\{([\s\S]*?)\}\s*else if\s*\(CONFIG\.DB_PROVIDER === 'appwrite'\)\s*\{[\s\S]*?\n(\s*)\})(?=\s*\} else \{|\s*\})/g;
    
    let matches = 0;
    content = content.replace(regex, (match, prefix, supabaseCode, indent) => {
        matches++;
        let cfdbLogic = convertSupabaseToCfDb(supabaseCode, indent);
        return prefix + "} else if (CONFIG.DB_PROVIDER === 'cf_db') {\\n" + cfdbLogic + "\\n" + indent;
    });

    if (matches > 0) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + matches + ' blocks in ' + file);
    }
});
