-- ============================================================
-- Promos Table Migration — Run this in Supabase SQL Editor
-- Project: Freelancing By Rifat E-Commerce
-- ============================================================

-- Basic coupon metadata columns
ALTER TABLE promos ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS disc_type TEXT DEFAULT 'flat';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS disc_val NUMERIC DEFAULT 0;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS max_cap NUMERIC;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS min_spend NUMERIC;

-- Delivery discount columns
ALTER TABLE promos ADD COLUMN IF NOT EXISTS del_reward TEXT DEFAULT 'none';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS del_disc_amount NUMERIC;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS del_disc_cap NUMERIC;

-- Restriction columns (stored as JSON arrays)
ALTER TABLE promos ADD COLUMN IF NOT EXISTS applicable_products JSONB DEFAULT '[]';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS applicable_categories JSONB DEFAULT '[]';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS applicable_districts JSONB DEFAULT '[]';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS applicable_payments JSONB DEFAULT '[]';

-- Repeated Customer Config columns
ALTER TABLE promos ADD COLUMN IF NOT EXISTS is_repeated_config BOOLEAN DEFAULT FALSE;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_type TEXT DEFAULT 'flat';
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_value NUMERIC DEFAULT 0;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_cap NUMERIC;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_expiry_days INTEGER DEFAULT 30;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_min_spend NUMERIC;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS rep_del_reward TEXT DEFAULT 'none';

-- Optional: Clean up old |v1| serialized codes (run CAREFULLY)
-- UPDATE promos SET code = split_part(code, '|v1|', 1) WHERE code LIKE '%|v1|%';
