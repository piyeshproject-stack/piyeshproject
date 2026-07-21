const fs = require('fs');

let content = fs.readFileSync('checkout.html', 'utf8');

// Block 1
content = content.replace(
    /p2 = appwriteDatabases\.listDocuments\(APP_DB, 'categories'.*?\n\s+\} else \{/,
    `p2 = appwriteDatabases.listDocuments(APP_DB, 'categories', [AppwriteQuery.equal('is_active', true), AppwriteQuery.orderAsc('sort_order')]).then(function(res) { return { data: res.documents.map(function(d){ d.id=d.$id; return d; }) }; }).catch(function() { return { data: [] }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        p1 = fetch('https://your-render-api.com/api/settings').then(res => res.json()).then(data => ({ data })).catch(() => ({ data: {} }));
        p2 = fetch('https://your-render-api.com/api/categories?is_active=true').then(res => res.json()).then(data => ({ data })).catch(() => ({ data: [] }));
    } else {`
);

// Block 2
content = content.replace(
    /promoPromise = appwriteDatabases\.listDocuments\(APP_DB, 'promo_codes'.*?\n\s+\} else \{/,
    `promoPromise = appwriteDatabases.listDocuments(APP_DB, 'promo_codes', [AppwriteQuery.equal('code', c), AppwriteQuery.limit(1)]).then(function(res) { return res.documents.length ? { data: res.documents[0] } : { data: null }; }).catch(function() { return { data: null }; });
        } else if (CONFIG.DB_PROVIDER === 'cf_db') {
            promoPromise = fetch(\`https://your-render-api.com/api/promo_codes?code=\${c}\`).then(res => res.json()).then(data => ({ data: Array.isArray(data) ? data[0] : data })).catch(() => ({ data: null }));
        } else {`
);

// Block 3
content = content.replace(
    /insertPromise = appwriteDatabases\.createDocument\(APP_DB, 'orders'.*?\n\s+\.then\(function\(doc\).*?\n\s+\.catch\(function\(err\).*?\n\s+\}/,
    `insertPromise = appwriteDatabases.createDocument(APP_DB, 'orders', orderId, awOrderData2)
            .then(function(doc) { return { data: [{ id: doc.$id }], error: null }; })
            .catch(function(err) { return { data: null, error: err }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        insertPromise = fetch('https://your-render-api.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        }).then(res => res.json()).then(data => ({ data: [{ id: orderId }], error: null })).catch(err => ({ data: null, error: err }));
    }`
);

// Block 4
content = content.replace(
    /selectPromise = appwriteDatabases\.getDocument\(APP_DB, 'orders'.*?\n\s+\.then\(function\(doc\).*?\n.*?\n.*?\n.*?\n.*?\n\s+\}\)\.catch\(function\(err\).*?\n\s+\}/,
    `selectPromise = appwriteDatabases.getDocument(APP_DB, 'orders', orderId)
            .then(function(doc) {
                doc.id = doc.$id; doc.created_at = doc.$createdAt; if (typeof doc.gallery_images === 'string') { try { doc.gallery_images = JSON.parse(doc.gallery_images); } catch(e) { doc.gallery_images = []; } }
                if (typeof doc.items  === 'string') { try { doc.items  = JSON.parse(doc.items);  } catch(e) { doc.items = []; } }
                if (typeof doc.addons === 'string') { try { doc.addons = JSON.parse(doc.addons); } catch(e) { doc.addons = []; } }
                return { data: doc, error: null };
            }).catch(function(err) { return { data: null, error: err }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        selectPromise = fetch(\`https://your-render-api.com/api/orders/\${orderId}\`)
            .then(res => res.json())
            .then(data => ({ data, error: null }))
            .catch(err => ({ data: null, error: err }));
    }`
);

// Block 5
content = content.replace(
    /dupCheck = appwriteDatabases\.listDocuments\(APP_DB, 'orders', \[\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n\s+\} else \{/,
    `dupCheck = appwriteDatabases.listDocuments(APP_DB, 'orders', [
                        AppwriteQuery.equal('payment_trx_id', trxId),
                        AppwriteQuery.limit(1)
                    ]).then(function(res) {
                        var docs = res.documents.filter(function(d) { return d.$id !== orderId; });
                        return docs.length ? { data: { id: docs[0].$id }, error: null } : { data: null, error: null };
                    }).catch(function(err) { return { data: null, error: err }; });
            } else if (trxId && CONFIG.DB_PROVIDER === 'cf_db') {
                dupCheck = fetch(\`https://your-render-api.com/api/orders?payment_trx_id=\${trxId}\`)
                    .then(res => res.json())
                    .then(data => {
                        var docs = (Array.isArray(data) ? data : []).filter(d => d.id !== orderId);
                        return docs.length ? { data: { id: docs[0].id }, error: null } : { data: null, error: null };
                    }).catch(err => ({ data: null, error: err }));
            } else {`
);

// Block 6
content = content.replace(
    /updatePromise = appwriteDatabases\.updateDocument\(APP_DB, 'orders', orderId, upData\)\n\s+\.then\(function\(\) \{ return \{ error: null \}; \}\)\n\s+\.catch\(function\(err\) \{ return \{ error: err \}; \}\);\n\s+\} else \{/,
    `updatePromise = appwriteDatabases.updateDocument(APP_DB, 'orders', orderId, upData)
                                .then(function() { return { error: null }; })
                                .catch(function(err) { return { error: err }; });
                        } else if (CONFIG.DB_PROVIDER === 'cf_db') {
                            updatePromise = fetch(\`https://your-render-api.com/api/orders/\${orderId}\`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(upData)
                            }).then(res => res.json()).then(data => ({ error: null })).catch(err => ({ error: err }));
                        } else {`
);

// Block 7
content = content.replace(
    /checkPromise = appwriteDatabases\.listDocuments\(APP_DB, 'verified_payments', \[\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n\s+\} else \{/,
    `checkPromise = appwriteDatabases.listDocuments(APP_DB, 'verified_payments', [
                AppwriteQuery.equal('transaction_id', txid),
                AppwriteQuery.limit(1)
            ]).then(function(res) {
                return res.documents.length
                    ? { data: { id: res.documents[0].$id }, error: null }
                    : { data: null, error: null };
            }).catch(function(err) { return { data: null, error: err }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        checkPromise = fetch(\`https://your-render-api.com/api/verified_payments?transaction_id=\${txid}\`)
            .then(res => res.json())
            .then(data => {
                var doc = Array.isArray(data) ? data[0] : null;
                return doc ? { data: { id: doc.id }, error: null } : { data: null, error: null };
            }).catch(err => ({ data: null, error: err }));
    } else {`
);

// Block 8
content = content.replace(
    /insPromise = appwriteDatabases\.createDocument\(APP_DB, 'verified_payments'.*?\n\s+\.then\(function\(\) \{ return \{ error: null \}; \}\)\n\s+\.catch\(function\(err\) \{ return \{ error: err \}; \}\);\n\s+\} else \{/,
    `insPromise = appwriteDatabases.createDocument(APP_DB, 'verified_payments', AppwriteID.unique(), awInsData)
            .then(function() { return { error: null }; })
            .catch(function(err) { return { error: err }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        insPromise = fetch('https://your-render-api.com/api/verified_payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(insData)
        }).then(res => res.json()).then(data => ({ error: null })).catch(err => ({ error: err }));
    } else {`
);

// Block 9
content = content.replace(
    /insertOrderPromise = appwriteDatabases\.createDocument\(APP_DB, 'orders', orderId, awCryptoOrder\)\n\s+\.then\(function\(doc\) \{ return \{ data: \[\{ id: doc\.\$id \}\], error: null \}; \}\)\n\s+\.catch\(function\(err\) \{ return \{ data: null, error: err \}; \}\);\n\s+\} else \{/,
    `insertOrderPromise = appwriteDatabases.createDocument(APP_DB, 'orders', orderId, awCryptoOrder)
            .then(function(doc) { return { data: [{ id: doc.$id }], error: null }; })
            .catch(function(err) { return { data: null, error: err }; });
    } else if (CONFIG.DB_PROVIDER === 'cf_db') {
        insertOrderPromise = fetch('https://your-render-api.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        }).then(res => res.json()).then(data => ({ data: [{ id: orderId }], error: null })).catch(err => ({ data: null, error: err }));
    } else {`
);

// Block 10
content = content.replace(
    /return appwriteDatabases\.updateDocument\(APP_DB, 'verified_payments', res\.documents\[0\]\.\$id, \{ order_id: orderId \}\);\n\s+\}\n\s+\}\)\.catch\(function\(err\) \{ console\.error\('VP update error:', err\.message\); \}\);\n\s+\}/,
    `return appwriteDatabases.updateDocument(APP_DB, 'verified_payments', res.documents[0].$id, { order_id: orderId });
                }
            }).catch(function(err) { console.error('VP update error:', err.message); });
        } else if (CONFIG.DB_PROVIDER === 'cf_db') {
            fetch(\`https://your-render-api.com/api/verified_payments?transaction_id=\${txid}\`).then(res => res.json()).then(data => {
                var doc = Array.isArray(data) ? data[0] : null;
                if (doc) {
                    fetch(\`https://your-render-api.com/api/verified_payments/\${doc.id}\`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: orderId })
                    });
                }
            }).catch(err => console.error('VP update error:', err));
        }`
);

fs.writeFileSync('checkout.html', content);
console.log('Updated checkout.html successfully');
