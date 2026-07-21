const fs = require('fs');

function replaceFile(filename, replaceLogic) {
    if(!fs.existsSync(filename)) { console.log(filename + ' not found'); return; }
    let content = fs.readFileSync(filename, 'utf8');
    content = replaceLogic(content);
    fs.writeFileSync(filename, content);
    console.log('Updated ' + filename);
}

replaceFile('shop.html', (content) => {
    return content.replace(
        /p4 = appwriteDatabases\.listDocuments\(APP_DB, 'product_categories'.*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        p1 = fetch('https://your-render-api.com/api/settings').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: {} }));
        p2 = fetch('https://your-render-api.com/api/categories?is_active=true').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p3 = fetch('https://your-render-api.com/api/products').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p4 = fetch('https://your-render-api.com/api/product_categories').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p5 = fetch('https://your-render-api.com/api/devtools').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: {} }));
    } else {`)
    );
});

replaceFile('product.html', (content) => {
    content = content.replace(
        /p6 = appwriteDatabases\.listDocuments\(APP_DB, 'reviews'.*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        p1 = fetch('https://your-render-api.com/api/settings').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: {} }));
        p2 = fetch(\`https://your-render-api.com/api/products/\${id}\`).then(r => r.json()).then(data => ({ data })).catch(() => ({ data: null }));
        p3 = fetch(\`https://your-render-api.com/api/reviews?product_id=\${id}&is_approved=true\`).then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p4 = fetch('https://your-render-api.com/api/products').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p5 = fetch('https://your-render-api.com/api/product_categories').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p6 = fetch(\`https://your-render-api.com/api/reviews?product_id=\${id}&is_approved=true&_sort=created_at:desc&_limit=\${REVIEWS_PAGE_SIZE}\`).then(r => r.json()).then(data => ({ data })).catch(() => ({ data: [] }));
        p7 = fetch('https://your-render-api.com/api/devtools').then(r => r.json()).then(data => ({ data })).catch(() => ({ data: {} }));
    } else {`)
    );
    
    content = content.replace(
        /reviewsPromise = appwriteDatabases\.listDocuments\(APP_DB, 'reviews'.*?offset\(reviewsShown\)]\)\.then\(function\(res\).*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        reviewsPromise = fetch(\`https://your-render-api.com/api/reviews?product_id=\${id}&is_approved=true&_sort=created_at:desc&_limit=\${REVIEWS_PAGE_SIZE}&_start=\${reviewsShown}\`).then(res => res.json()).then(data => ({ data, error: null })).catch(err => ({ data: [], error: err }));
    } else {`)
    );
    
    content = content.replace(
        /insPromise = appwriteDatabases\.createDocument\(APP_DB, 'reviews'.*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        insPromise = fetch('https://your-render-api.com/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rvData) }).then(res => res.json()).then(data => ({ error: null })).catch(err => ({ error: err }));
    } else {`)
    );
    return content;
});

replaceFile('cart.html', (content) => {
    return content.replace(
        /return \{ data: \{\} \};\n\s+\}\)\.catch\(function\(\) \{ return \{ data: \{\} \}; \}\);\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
            settingsPromise = fetch('https://your-render-api.com/api/settings').then(res => res.json()).then(data => ({ data })).catch(() => ({ data: {} }));
        } else {`)
    );
});

replaceFile('track.html', (content) => {
    content = content.replace(
        /settingsPromise = appwriteDatabases\.getDocument\(APP_DB, 'settings', 'main_settings'\).*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        settingsPromise = fetch('https://your-render-api.com/api/settings').then(res => res.json()).then(data => ({ data })).catch(() => ({ data: {} }));
    } else {`)
    );
    
    content = content.replace(
        /trackPromise = appwriteDatabases\.listDocuments\(APP_DB, 'orders'.*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        trackPromise = fetch(\`https://your-render-api.com/api/orders?id=\${orderId}&customer_phone=\${phone}\`).then(res => res.json()).then(data => { var doc = Array.isArray(data) ? data[0] : data; return { data: doc || null }; }).catch(err => ({ data: null, error: err }));
    } else {`)
    );
    return content;
});

replaceFile('success.html', (content) => {
    return content.replace(
        /p2 = appwriteDatabases\.getDocument\(APP_DB, 'orders', orderId\).*?\n\s+\} else \{/g,
        match => match.replace('} else {', `} else if (CONFIG.DB_PROVIDER === 'cf_db') {
        p1 = fetch('https://your-render-api.com/api/settings').then(res => res.json()).then(data => ({ data })).catch(() => ({ data: {} }));
        p2 = fetch(\`https://your-render-api.com/api/orders/\${orderId}\`).then(res => res.json()).then(data => ({ data })).catch(() => ({ data: null }));
    } else {`)
    );
});
