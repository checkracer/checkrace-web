-- =========================================================
-- Checkrace — self-hosted Blog + anonymous article ratings (D1)
-- DB: checkrace-db  (binding: DB)
-- Apply:  npx wrangler d1 execute checkrace-db --remote --file=./schema.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  slug         TEXT PRIMARY KEY,                 -- url slug
  title        TEXT NOT NULL,
  language     TEXT NOT NULL DEFAULT 'th',       -- th | en
  category     TEXT,                             -- training | event | nutrition | gear | inspire | news
  excerpt      TEXT,
  cover_image  TEXT,                             -- image URL
  cover_alt    TEXT,
  body         TEXT,                             -- HTML
  author       TEXT,
  tags         TEXT,                             -- comma-separated
  featured     INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  views        INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_status  ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_listing ON blog_posts(status, featured, published_at);

-- Anonymous star ratings: one rating per (post, device). `voter` is a salted
-- hash of IP + User-Agent so the same visitor updates rather than stacks votes.
CREATE TABLE IF NOT EXISTS blog_ratings (
  slug       TEXT NOT NULL,
  voter      TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug, voter)
);
CREATE INDEX IF NOT EXISTS idx_blog_ratings_slug ON blog_ratings(slug);

-- Seed: one published welcome article
INSERT OR IGNORE INTO blog_posts
  (slug, title, language, category, excerpt, cover_alt, body, author, tags, featured, status, published_at)
VALUES (
  'welcome-to-checkrace-blog',
  'ยินดีต้อนรับสู่บล็อก Checkrace',
  'th',
  'news',
  'รวมบทความ เคล็ดลับการวิ่ง รีวิวงาน และเรื่องราวจากวงการวิ่งไทย โดยทีม Checkrace',
  'นักวิ่งกำลังวิ่งในงานมาราธอน',
  '<p>ยินดีต้อนรับสู่บล็อกของ <strong>Checkrace</strong> — พื้นที่ที่เรารวบรวมบทความเกี่ยวกับการวิ่ง เคล็ดลับการฝึกซ้อม รีวิวงานวิ่ง โภชนาการ และเรื่องราวสร้างแรงบันดาลใจจากวงการวิ่งไทย</p><h2>มีอะไรในบล็อกนี้บ้าง</h2><ul><li>เคล็ดลับการฝึกซ้อมและเตรียมตัวก่อนแข่ง</li><li>รีวิวงานวิ่งและเส้นทางทั่วประเทศ</li><li>โภชนาการและการดูแลร่างกายนักวิ่ง</li><li>ข่าวสารและกิจกรรมจาก Checkrace</li></ul><p>อ่านจบแล้วอย่าลืม <strong>ให้ดาวบทความ</strong> ด้านล่างเพื่อบอกเราว่าคุณชอบแค่ไหน 🌟</p>',
  'ทีม Checkrace',
  'checkrace,running,blog',
  1,
  'published',
  CURRENT_TIMESTAMP
);
