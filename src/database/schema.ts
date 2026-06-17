/**
 * PowerSync Database Schema
 *
 * This schema defines the local SQLite database structure
 * that syncs with Supabase PostgreSQL via PowerSync.
 *
 * The schema is based on the original OpenToon app's database structure.
 */

export const DATABASE_SCHEMA = `
-- ============================================================
-- COMICS TABLE
-- Stores manga/manhwa comic information
-- ============================================================
CREATE TABLE IF NOT EXISTS comics (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'manga',
  language TEXT DEFAULT 'ja',
  target_language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- CHAPTERS TABLE
-- Stores chapter information for each comic
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  comic_id TEXT NOT NULL,
  title TEXT,
  chapter_number TEXT,
  url TEXT,
  authorized_image_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

-- ============================================================
-- RAW PAGES TABLE
-- Stores original page images and their metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS raw_page (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  raw_image_uri TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- ============================================================
-- TRANSLATION UNITS TABLE
-- Stores stitched panorama images and inpainted results
-- ============================================================
CREATE TABLE IF NOT EXISTS translation_unit (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  stitched_raw_image_uri TEXT,
  inpainted_image_uri TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- ============================================================
-- TRANSLATION UNIT PAGES TABLE
-- Junction table linking translation units to raw pages
-- ============================================================
CREATE TABLE IF NOT EXISTS translation_unit_pages (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  raw_page_id TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY (translation_unit_id) REFERENCES translation_unit(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_page_id) REFERENCES raw_page(id) ON DELETE CASCADE
);

-- ============================================================
-- TEXT BLOCKS TABLE
-- Stores detected/translated text blocks with positions
-- ============================================================
CREATE TABLE IF NOT EXISTS text_blocks (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  sequence INTEGER DEFAULT 0,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  rotation_deg REAL DEFAULT 0,
  font_color TEXT DEFAULT '#000000',
  raw_text TEXT,
  translated_text TEXT,
  display_mode TEXT DEFAULT 'overlay',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (translation_unit_id) REFERENCES translation_unit(id) ON DELETE CASCADE
);

-- ============================================================
-- USER SETTINGS TABLE
-- Stores user preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  scroll_mode TEXT DEFAULT 'vertical',
  swipe_direction TEXT DEFAULT 'left_to_right',
  text_font TEXT DEFAULT 'default',
  source_language TEXT DEFAULT 'ja',
  target_language TEXT DEFAULT 'en',
  server_url TEXT,
  api_key TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- ONBOARDING FLAGS TABLE
-- Tracks tutorial/onboarding progress
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_flags (
  id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_raw_page_chapter_id ON raw_page(chapter_id);
CREATE INDEX IF NOT EXISTS idx_translation_unit_chapter_id ON translation_unit(chapter_id);
CREATE INDEX IF NOT EXISTS idx_text_blocks_translation_unit_id ON text_blocks(translation_unit_id);
`;

/**
 * Database queries used throughout the app
 */
export const QUERIES = {
  // Comic operations
  INSERT_COMIC: `INSERT INTO comics (id, user_id, title, type, language, target_language) VALUES (?, ?, ?, ?, ?, ?)`,
  GET_COMICS: `SELECT * FROM comics ORDER BY updated_at DESC`,
  DELETE_COMIC: `DELETE FROM comics WHERE id = ?`,

  // Chapter operations
  INSERT_CHAPTER: `INSERT INTO chapters (id, comic_id, title, chapter_number, url) VALUES (?, ?, ?, ?, ?)`,
  GET_CHAPTERS: `SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC`,
  DELETE_CHAPTER: `DELETE FROM chapters WHERE id = ?`,

  // Raw page operations
  INSERT_RAW_PAGE: `INSERT INTO raw_page (id, chapter_id, page_number, raw_image_uri) VALUES (?, ?, ?, ?)`,
  GET_RAW_PAGES: `SELECT * FROM raw_page WHERE chapter_id = ? ORDER BY page_number ASC`,
  DELETE_RAW_PAGES: `DELETE FROM raw_page WHERE chapter_id = ?`,

  // Translation unit operations
  INSERT_TRANSLATION_UNIT: `INSERT INTO translation_unit (id, chapter_id, stitched_raw_image_uri, inpainted_image_uri) VALUES (?, ?, ?, ?)`,
  GET_TRANSLATION_UNITS: `SELECT * FROM translation_unit WHERE chapter_id = ?`,

  // Text block operations
  INSERT_TEXT_BLOCK: `INSERT INTO text_blocks (id, translation_unit_id, sequence, x, y, width, height, rotation_deg, font_color, raw_text, translated_text, display_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  GET_TEXT_BLOCKS: `SELECT * FROM text_blocks WHERE translation_unit_id = ? ORDER BY sequence ASC`,
  UPDATE_TRANSLATED_TEXT: `UPDATE text_blocks SET translated_text = ?, updated_at = datetime('now') WHERE id = ?`,
  UPDATE_DISPLAY_MODE: `UPDATE text_blocks SET display_mode = ?, updated_at = datetime('now') WHERE id = ?`,

  // User settings operations
  UPSERT_SETTINGS: `INSERT OR REPLACE INTO user_settings (id, scroll_mode, swipe_direction, text_font, source_language, target_language, server_url, api_key) VALUES ('default', ?, ?, ?, ?, ?, ?, ?)`,
  GET_SETTINGS: `SELECT * FROM user_settings WHERE id = 'default'`,

  // Statistics
  GET_CHAPTER_STATS: `
    SELECT
      c.id,
      c.title,
      c.chapter_number,
      COUNT(DISTINCT rp.id) as page_count,
      COUNT(DISTINCT tu.id) as translation_unit_count,
      COUNT(DISTINCT tb.id) as text_block_count,
      SUM(CASE WHEN tb.translated_text IS NOT NULL THEN 1 ELSE 0 END) as translated_count
    FROM chapters c
    LEFT JOIN raw_page rp ON rp.chapter_id = c.id
    LEFT JOIN translation_unit tu ON tu.chapter_id = c.id
    LEFT JOIN text_blocks tb ON tb.translation_unit_id = tu.id
    WHERE c.comic_id = ?
    GROUP BY c.id
    ORDER BY c.chapter_number ASC
  `,
};
