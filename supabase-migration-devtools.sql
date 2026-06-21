-- ============================================================
-- Migration: Separate DevTools Columns into their own table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create the new devtools table
CREATE TABLE IF NOT EXISTS devtools (
    id INTEGER PRIMARY KEY DEFAULT 1,
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_message TEXT DEFAULT '',
    custom_css TEXT DEFAULT ''
);

-- 2. Enable RLS on the new table (so your site can read/update it)
ALTER TABLE devtools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read devtools" ON devtools;
CREATE POLICY "Allow public read devtools" ON devtools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update devtools" ON devtools;
CREATE POLICY "Allow public update devtools" ON devtools FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public insert devtools" ON devtools;
CREATE POLICY "Allow public insert devtools" ON devtools FOR INSERT WITH CHECK (true);

-- 3. Transfer existing data from settings to devtools
-- We use '' for custom_css as it didn't exist in settings previously
INSERT INTO devtools (id, maintenance_mode, maintenance_message, custom_css)
SELECT 
    1, 
    COALESCE(maintenance_mode, false), 
    COALESCE(maintenance_message, ''), 
    ''
FROM settings
WHERE id = 1
ON CONFLICT (id) DO UPDATE 
SET 
    maintenance_mode = EXCLUDED.maintenance_mode,
    maintenance_message = EXCLUDED.maintenance_message;

-- 4. Delete only the devtools-specific columns from the settings table
ALTER TABLE settings
    DROP COLUMN IF EXISTS maintenance_mode,
    DROP COLUMN IF EXISTS maintenance_message;
