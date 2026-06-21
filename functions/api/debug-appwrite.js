// ============================================================
// functions/api/debug-appwrite.js
// Temporary debug endpoint — shows exact Appwrite connection status
// Visit: https://your-site.pages.dev/api/debug-appwrite
// DELETE this file after debugging is done!
// ============================================================

import { getConfig } from '../utils/config.js';

export async function onRequest(context) {
    const config = getConfig(context.env);
    const report = {};

    report.DB_PROVIDER         = config.DB_PROVIDER;
    report.APPWRITE_ENDPOINT   = config.APPWRITE_ENDPOINT || '❌ NOT SET';
    report.APPWRITE_PROJECT    = config.APPWRITE_PROJECT  ? '✅ SET' : '❌ NOT SET';
    report.APPWRITE_API_KEY    = config.APPWRITE_API_KEY  ? '✅ SET' : '❌ NOT SET';
    report.APPWRITE_DATABASE_ID = config.APPWRITE_DATABASE_ID || '❌ NOT SET';
    report.APPWRITE_COLLECTION_PRODUCTS  = config.APPWRITE_COLLECTION_PRODUCTS  || '❌ NOT SET';
    report.APPWRITE_COLLECTION_SETTINGS  = config.APPWRITE_COLLECTION_SETTINGS  || '❌ NOT SET';
    report.APPWRITE_COLLECTION_CATEGORIES = config.APPWRITE_COLLECTION_CATEGORIES || '❌ NOT SET';

    // Test: can we reach Appwrite at all?
    try {
        const pingUrl = `${config.APPWRITE_ENDPOINT}/databases/${config.APPWRITE_DATABASE_ID}`;
        const pingRes = await fetch(pingUrl, {
            headers: {
                'X-Appwrite-Project': config.APPWRITE_PROJECT,
                'X-Appwrite-Key':     config.APPWRITE_API_KEY,
            },
        });
        report.database_ping = pingRes.ok
            ? `✅ OK (${pingRes.status})`
            : `❌ FAILED (${pingRes.status}: ${await pingRes.text()})`;
    } catch (e) {
        report.database_ping = `❌ ERROR: ${e.message}`;
    }

    // Test: can we list products?
    try {
        const qLimit = encodeURIComponent(JSON.stringify({ method: 'limit', values: [1] }));
        const url = `${config.APPWRITE_ENDPOINT}/databases/${config.APPWRITE_DATABASE_ID}/collections/${config.APPWRITE_COLLECTION_PRODUCTS}/documents?queries[]=${qLimit}`;
        const res = await fetch(url, {
            headers: {
                'X-Appwrite-Project': config.APPWRITE_PROJECT,
                'X-Appwrite-Key':     config.APPWRITE_API_KEY,
            },
        });
        if (res.ok) {
            const json = await res.json();
            report.products_test = `✅ OK — total: ${json.total}, fetched: ${json.documents?.length}`;
            if (json.documents?.length > 0) {
                report.first_product_keys = Object.keys(json.documents[0]);
            }
        } else {
            report.products_test = `❌ FAILED (${res.status}): ${await res.text()}`;
        }
    } catch (e) {
        report.products_test = `❌ ERROR: ${e.message}`;
    }

    // Test: can we read settings?
    try {
        const qLimit = encodeURIComponent(JSON.stringify({ method: 'limit', values: [5] }));
        const url = `${config.APPWRITE_ENDPOINT}/databases/${config.APPWRITE_DATABASE_ID}/collections/${config.APPWRITE_COLLECTION_SETTINGS}/documents?queries[]=${qLimit}`;
        const res = await fetch(url, {
            headers: {
                'X-Appwrite-Project': config.APPWRITE_PROJECT,
                'X-Appwrite-Key':     config.APPWRITE_API_KEY,
            },
        });
        if (res.ok) {
            const json = await res.json();
            report.settings_test = `✅ OK — total: ${json.total}`;
        } else {
            report.settings_test = `❌ FAILED (${res.status}): ${await res.text()}`;
        }
    } catch (e) {
        report.settings_test = `❌ ERROR: ${e.message}`;
    }

    return new Response(JSON.stringify(report, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
