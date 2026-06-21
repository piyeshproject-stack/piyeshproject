-- ════════════════════════════════════════════════════════════
-- COMPLETE MIGRATION — Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- ═══ 1. Maintenance Mode Columns ═══
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS maintenance_mode    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT    DEFAULT '';

-- ═══ 2. Review ImgBB Key ═══
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS review_imgbb_key TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS hf_api_url TEXT DEFAULT '';

-- ═══ 3. Home Sections Table ═══
CREATE TABLE IF NOT EXISTS home_sections (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'category',
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_ids  JSONB DEFAULT '[]',
  max_products INTEGER DEFAULT 10,
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ 4. REVIEWS — RLS POLICIES (MOST IMPORTANT!) ═══
-- Drop old restrictive policies first (if they exist)
DROP POLICY IF EXISTS "Allow public read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON reviews;

-- Enable RLS (safe to call if already on)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- POLICY A: Anyone can READ ALL reviews (admin needs to see pending too)
CREATE POLICY "Allow public read all reviews"
  ON reviews FOR SELECT
  USING (true);

-- POLICY B: Anyone can INSERT reviews (customers submit)
CREATE POLICY "Allow public insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- POLICY C: Anyone can UPDATE reviews (admin approve/reject)
CREATE POLICY "Allow public update reviews"
  ON reviews FOR UPDATE
  USING (true);

-- POLICY D: Anyone can DELETE reviews (admin delete)
CREATE POLICY "Allow public delete reviews"
  ON reviews FOR DELETE
  USING (true);

-- ═══ 5. ORDERS — RLS POLICIES ═══
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update orders"
  ON orders FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete orders"
  ON orders FOR DELETE
  USING (true);

-- ═══ 6. SETTINGS — RLS POLICIES ═══
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read settings" ON settings;
DROP POLICY IF EXISTS "Allow public update settings" ON settings;

CREATE POLICY "Allow public read settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public update settings"
  ON settings FOR UPDATE
  USING (true);

-- ═══ 7. PRODUCTS — RLS POLICIES ═══
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read products" ON products;

CREATE POLICY "Allow public read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update products"
  ON products FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete products"
  ON products FOR DELETE
  USING (true);

-- ═══ 8. CATEGORIES — RLS POLICIES ═══
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON categories;

CREATE POLICY "Allow public read categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public all categories"
  ON categories FOR ALL
  USING (true);

-- ═══ 9. BANNERS — RLS POLICIES ═══
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read banners" ON banners;

CREATE POLICY "Allow public all banners"
  ON banners FOR ALL
  USING (true);

-- ═══ 10. HOME_SECTIONS — RLS POLICIES ═══
ALTER TABLE home_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all home_sections"
  ON home_sections FOR ALL
  USING (true);

-- ═══ DONE! ═══
-- All tables now have proper RLS policies for public access.
-- Admin panel will be able to read/write all data.
-- Customers can submit reviews and orders.
