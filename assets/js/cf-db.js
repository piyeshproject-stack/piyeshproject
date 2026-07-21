/**
 * cf-db.js — Cloudflare D1 API Helper
 *
 * DB_PROVIDER === 'cf_db' হলে এই helper ব্যবহার করো।
 * Vercel Serverless API (/api/cf/[table]) এর wrapper।
 *
 * Usage:
 *   cfDb.list('orders')                          → GET /api/cf/orders
 *   cfDb.list('orders', { filter: { status: 'Pending' } })
 *   cfDb.get('orders', id)                       → GET /api/cf/orders?id=xxx
 *   cfDb.insert('orders', payload)               → POST /api/cf/orders
 *   cfDb.update('orders', id, payload)           → PATCH /api/cf/orders?id=xxx
 *   cfDb.remove('orders', id)                    → DELETE /api/cf/orders?id=xxx
 */

(function() {
    'use strict';

    function getBaseUrl() {
        var base = (typeof CONFIG !== 'undefined' && CONFIG.CF_WORKER_URL) ? CONFIG.CF_WORKER_URL : '';
        return base.replace(/\/$/, ''); // trailing slash remove
    }

    /**
     * Internal fetch wrapper
     * @param {string} table
     * @param {string} method
     * @param {object|null} body
     * @param {URLSearchParams} qs
     */
    function cfFetch(table, method, body, qs) {
        var base = getBaseUrl();
        var url  = base + '/api/cf/' + table;
        if (qs && qs.toString()) url += '?' + qs.toString();

        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);

        return fetch(url, opts)
            .then(function(r) { return r.json(); })
            .then(function(json) {
                if (!json.success) throw new Error(json.error || 'CF DB error');
                return json;
            });
    }

    /**
     * List rows from a table.
     * @param {string} table
     * @param {object} [opts]
     * @param {object} [opts.filter]   - { column: value } pairs → WHERE column = value
     * @param {string} [opts.order]    - column to ORDER BY DESC (default: created_at)
     * @param {number} [opts.limit]    - LIMIT (default: 5000)
     * @param {string} [opts.select]   - columns to select (default: *)
     * @returns {Promise<Array>}
     */
    function list(table, opts) {
        opts = opts || {};
        var qs = new URLSearchParams();
        if (opts.order)  qs.set('order', opts.order);
        if (opts.limit)  qs.set('limit', opts.limit);
        if (opts.select) qs.set('select', opts.select);
        if (opts.filter) {
            Object.keys(opts.filter).forEach(function(col) {
                qs.set('filter[' + col + ']', opts.filter[col]);
            });
        }
        return cfFetch(table, 'GET', null, qs)
            .then(function(json) { return json.data || []; });
    }

    /**
     * Get a single row by ID.
     * @param {string} table
     * @param {string} id
     * @returns {Promise<object>}
     */
    function get(table, id) {
        var qs = new URLSearchParams({ id: id });
        return cfFetch(table, 'GET', null, qs)
            .then(function(json) { return json.data; });
    }

    /**
     * Insert a new row.
     * @param {string} table
     * @param {object} payload
     * @returns {Promise<{success: boolean, id: string}>}
     */
    function insert(table, payload) {
        return cfFetch(table, 'POST', payload, null);
    }

    /**
     * Update an existing row.
     * @param {string} table
     * @param {string} id
     * @param {object} payload
     * @returns {Promise<{success: boolean}>}
     */
    function update(table, id, payload) {
        var qs = new URLSearchParams({ id: id });
        return cfFetch(table, 'PATCH', payload, qs);
    }

    /**
     * Delete a row by ID.
     * @param {string} table
     * @param {string} id
     * @returns {Promise<{success: boolean}>}
     */
    function remove(table, id) {
        var qs = new URLSearchParams({ id: id });
        return cfFetch(table, 'DELETE', null, qs);
    }

    // Expose globally
    window.cfDb = {
        list:   list,
        get:    get,
        insert: insert,
        update: update,
        remove: remove,
    };

})();
