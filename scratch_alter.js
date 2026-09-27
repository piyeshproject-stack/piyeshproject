const crypto = require('crypto');
const _E = [118,110,101,104,118,57,55,50,84,64,39,35,50,63,53,56,53];
const _K = [4,7,3,9,2,8,5,1,6,0];
const masterPw = _E.map((c, i) => String.fromCharCode(c ^ _K[i % _K.length])).join('');
const hash = crypto.createHash('sha256').update(masterPw + '__sys__').digest('hex');

const sql = `ALTER TABLE settings ADD COLUMN theme_colors TEXT DEFAULT '{"primary":"#FF4D4D","bg_body":"#F4F7FE","bg_card":"#FFFFFF","text_dark":"#1A1A2E","text_muted":"#888888"}'`;

fetch('https://store.freelancingbyrifat.top/api/dev-query', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Dev-Key': hash
    },
    body: JSON.stringify({ sql })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
