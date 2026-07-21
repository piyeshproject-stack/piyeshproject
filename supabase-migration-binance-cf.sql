-- ============================================================
-- Migration: Add Binance API Key/Secret columns to settings
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS binance_api_key    text DEFAULT '',
    ADD COLUMN IF NOT EXISTS binance_api_secret text DEFAULT '';

-- Update verify_mode default to 'cloudflare' for new rows
ALTER TABLE settings
    ALTER COLUMN verify_mode SET DEFAULT 'cloudflare';
