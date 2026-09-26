// ─────────────────────────────────────────────
// functions/api/admin/add-mod.js
// POST /api/admin/add-mod
// Super admin → Add/Update/Delete moderator
// Auth: ENV ADMIN_USERNAME + ADMIN_PASSWORD
// KV write: 1 (in MOD_KV — separate namespace)
// ─────────────────────────────────────────────
import { ok, err, cors, hashPassword } from '../_auth-helper.js';

export const onRequestOptions = () => cors();

// Available permissions
const VALID_PERMISSIONS = ['orders', 'products', 'reviews', 'promos', 'customers'];

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // ── Verify super admin (env variable — never stored in DB) ──
        const authHeader = request.headers.get('Authorization') || '';
        const [scheme, b64] = authHeader.split(' ');
        if (scheme !== 'Basic') return err('Basic auth দরকার', 401);

        const [username, password] = atob(b64).split(':');
        const validUser = env.ADMIN_USERNAME || 'admin';
        const validPass = env.ADMIN_PASSWORD || '1234';
        if (username !== validUser || password !== validPass)
            return err('Super admin credentials ভুল', 401);

        const { action, email, name, mod_password, permissions } = await request.json();
        if (!email) return err('email দিন');

        const key = `mod:${email.toLowerCase()}`;

        // ── DELETE moderator ──
        if (action === 'delete') {
            await env.MOD_KV.delete(key);
            return ok({ message: `${email} moderator account মুছে ফেলা হয়েছে` });
        }

        // ── TOGGLE active/inactive ──
        if (action === 'toggle') {
            const raw = await env.MOD_KV.get(key);
            if (!raw) return err('Moderator পাওয়া যায়নি', 404);
            const mod = JSON.parse(raw);
            mod.is_active = !mod.is_active;
            await env.MOD_KV.put(key, JSON.stringify(mod));
            return ok({ message: `${email} ${mod.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`, is_active: mod.is_active });
        }

        // ── LIST all moderators ──
        if (action === 'list') {
            const list = await env.MOD_KV.list({ prefix: 'mod:' });
            const mods = await Promise.all(
                list.keys.map(async ({ name: k }) => {
                    const raw = await env.MOD_KV.get(k);
                    if (!raw) return null;
                    const { password_hash, ...m } = JSON.parse(raw);
                    return m;
                })
            );
            return ok({ moderators: mods.filter(Boolean) });
        }

        // ── ADD or UPDATE moderator ──
        if (!name || !mod_password) return err('name ও mod_password দিন');
        if (mod_password.length < 6) return err('Password কমপক্ষে ৬ অক্ষর');

        // Validate permissions
        const perms = (permissions || []).filter(p => VALID_PERMISSIONS.includes(p));

        const existing = await env.MOD_KV.get(key);
        const mod = existing ? JSON.parse(existing) : {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
        };

        mod.email = email.toLowerCase();
        mod.name = name.trim();
        mod.password_hash = await hashPassword(mod_password);
        mod.permissions = perms;
        mod.is_active = true;
        mod.updated_at = new Date().toISOString();

        // ── 1 KV write to MOD_KV (separate namespace, separate limit) ──
        await env.MOD_KV.put(key, JSON.stringify(mod));

        return ok({
            message: `Moderator ${existing ? 'আপডেট' : 'তৈরি'} হয়েছে`,
            mod: { id: mod.id, email: mod.email, name: mod.name, permissions: mod.permissions },
        }, existing ? 200 : 201);
    } catch (e) {
        return err(e.message, 500);
    }
}
