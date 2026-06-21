const ENDPOINT   = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '69de4fa50032182e9b91';
const API_KEY    = 'standard_360879e9675a24ef2d8dbba7ff08c36a3157f50a8707e5fa11ad7ac393b7f6c608dbf5781f2741f4833323f676e5857d52063eacf19371591a48db65d65371bead6cf8ac6e16927a268aedabf2a02bd78cf8eb9f55d1cf9c2b4ed62f26b83e871075868759e97a4ee4e2199d353f5d870960e1d80ad0d65cfc04bd8c889094eb';  // ← এখানে API Key দাও
const DB_ID      = '6a19e07f002427086405';

// এই field গুলো Appwrite Dashboard থেকে আগে DELETE করো,
// তারপর এই script রান করো। তাহলে 1,000,000 size দিয়ে নতুন করে তৈরি হবে।
const fixes = [
    { collection: 'settings', id: 'messaging_apps',      type: 'string', size: 1000000 },
    { collection: 'settings', id: 'telegram_main_chats', type: 'string', size: 1000000 },
    { collection: 'settings', id: 'crypto_coins',        type: 'string', size: 1000000 },
    { collection: 'settings', id: 'hf_api_url',          type: 'string', size: 500 },
];

async function req(method, path, body) {
    const url = `${ENDPOINT}${path}`;
    const headers = { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY, 'Content-Type': 'application/json' };
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (!res.ok) {
        const e = await res.json();
        if (e.code === 409) return { exists: true };
        throw new Error(e.message || 'Unknown error');
    }
    return await res.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    if (API_KEY === 'ENTER_YOUR_API_KEY_HERE') {
        console.error('ERROR: API Key দাও (line 4)!');
        return;
    }

    for (const f of fixes) {
        const path = `/databases/${DB_ID}/collections/${f.collection}/attributes/${f.type}`;
        const payload = { key: f.id, required: false, array: false, size: f.size };
        try {
            await req('POST', path, payload);
            console.log(`[+] Added: ${f.collection}.${f.id} (size: ${f.size})`);
        } catch(e) {
            if (e.exists) console.log(`[~] Already exists: ${f.id} — Dashboard থেকে Delete করো আগে!`);
            else console.log(`[!] Error on ${f.id}: ${e.message}`);
        }
        await sleep(800);
    }
    console.log('\n✅ Done!');
}

run();
