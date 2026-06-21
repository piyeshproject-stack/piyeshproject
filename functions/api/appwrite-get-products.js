// ============================================================
// functions/api/appwrite-get-products.js
// Cloudflare Pages Function — Fetch all products from Appwrite database
// ============================================================

import { getConfig } from '../utils/config.js';

// JSON fields stored as strings in Appwrite — parse them back
const JSON_FIELDS = ['variants', 'gallery_images', 'product_ids', 'category_ids'];

function parseJsonFields(doc) {
    const out = { ...doc };
    for (const key of JSON_FIELDS) {
        if (key in out && typeof out[key] === 'string') {
            try { out[key] = JSON.parse(out[key]); } catch (_) {}
        }
    }
    return out;
}

function mapDoc(doc) {
    const mapped = { ...doc };
    mapped.id         = doc.$id;
    mapped.created_at = doc.$createdAt;
    mapped.updated_at = doc.$updatedAt;
    delete mapped.$id;
    delete mapped.$createdAt;
    delete mapped.$updatedAt;
    delete mapped.$permissions;
    delete mapped.$collectionId;
    delete mapped.$databaseId;
    return parseJsonFields(mapped);
}

// JSON query builder for Appwrite v1.9.5+
const Q = {
    limit:  (n)    => JSON.stringify({ method: 'limit',  values: [n] }),
    offset: (n)    => JSON.stringify({ method: 'offset', values: [n] }),
};

// Appwrite max per request is 100 — paginate to get all documents
async function fetchAllAppwriteDocs(url, headers) {
    let all    = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const params = new URLSearchParams();
        params.append('queries[]', Q.limit(limit));
        params.append('queries[]', Q.offset(offset));

        const res = await fetch(`${url}?${params}`, { headers });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Appwrite error ${res.status}: ${err}`);
        }

        const json = await res.json();
        const docs  = json.documents || [];
        all = all.concat(docs);

        if (docs.length < limit) break;   // no more pages
        offset += limit;
    }

    return all;
}

export async function onRequest(context) {
    const config = getConfig(context.env);

    try {
        const baseUrl = `${config.APPWRITE_ENDPOINT}/databases/${config.APPWRITE_DATABASE_ID}/collections/${config.APPWRITE_COLLECTION_PRODUCTS}/documents`;
        const headers = {
            'X-Appwrite-Project': config.APPWRITE_PROJECT,
            'Content-Type':       'application/json',
        };
        if (config.APPWRITE_API_KEY) {
            headers['X-Appwrite-Key'] = config.APPWRITE_API_KEY;
        }

        const docs = await fetchAllAppwriteDocs(baseUrl, headers);
        const finalData = docs.map(mapDoc);

        return new Response(JSON.stringify(finalData), {
            status:  200,
            headers: {
                'Content-Type':                'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Failed to fetch products', details: String(error) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
