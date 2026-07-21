-- ============================================================
-- Home Sections Migration — Run this in Supabase SQL Editor
-- Project: Freelancing By Rifat E-Commerce
-- ============================================================

CREATE TABLE IF NOT EXISTS home_sections (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'category',
  -- type: 'category' | 'custom' | 'all_products'
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_ids  JSONB DEFAULT '[]',
  max_products INTEGER DEFAULT 10,
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE home_sections ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (for frontend rendering)
CREATE POLICY IF NOT EXISTS "Allow public read home_sections"
  ON home_sections FOR SELECT USING (true);

-- Allow all operations for authenticated admin users
CREATE POLICY IF NOT EXISTS "Allow admin all home_sections"
  ON home_sections FOR ALL USING (auth.role() = 'authenticated');

-- Also add review_imgbb_key column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS review_imgbb_key TEXT DEFAULT '';
