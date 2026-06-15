-- Running Calendar Module — schema for checkrace-db (events + organizers + venues).
-- Apply: npx wrangler d1 execute checkrace-db --remote --file=./schema-calendar.sql
-- Ported from the running-calendar-module skill (no profiles FK; admin = Cloudflare Access email).

CREATE TABLE IF NOT EXISTS events (
  id                 TEXT PRIMARY KEY,
  organizer_user_id  TEXT,                  -- admin email that created it (or null)
  name               TEXT NOT NULL,
  slug               TEXT UNIQUE NOT NULL,
  date               TEXT NOT NULL,         -- YYYY-MM-DD
  register_open      TEXT,
  register_close     TEXT,
  venue              TEXT,
  venue_id           TEXT,                  -- -> venues.id
  province           TEXT,
  region             TEXT,
  distance           TEXT,                  -- "5/10/21K"
  type               TEXT DEFAULT 'Road' CHECK (type IN ('Road','Trail','Virtual')),
  status             TEXT DEFAULT 'Coming Soon',
  fee                TEXT,
  website            TEXT,
  facebook_link      TEXT,
  register_link      TEXT,
  telephone          TEXT,
  email              TEXT,
  cover_image_url    TEXT,
  promoter           TEXT,
  host_id            TEXT,                  -- -> organizers.id (ผู้จัดงาน/เจ้าของงาน)
  organizer_id       TEXT,                  -- -> organizers.id (ออแกไนเซอร์)
  series             TEXT,                  -- non-empty = Annual Race
  race_category      TEXT,                  -- standard | event | charity
  package            TEXT DEFAULT 'free',   -- free | basic | certified | premium
  package_paid       INTEGER DEFAULT 0,
  visible            INTEGER DEFAULT 1,
  views              INTEGER DEFAULT 0,
  registration_count INTEGER DEFAULT 0,
  notes              TEXT,
  created_at         TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at         TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_date         ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_visible      ON events(visible);
CREATE INDEX IF NOT EXISTS idx_events_venue_id     ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_host_id      ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

CREATE TABLE IF NOT EXISTS organizers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_norm   TEXT UNIQUE NOT NULL,
  kind        TEXT DEFAULT 'organizer',   -- owner | organizer
  logo_url    TEXT,
  facebook    TEXT,
  website     TEXT,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_organizers_name ON organizers(name);

CREATE TABLE IF NOT EXISTS venues (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_norm   TEXT UNIQUE NOT NULL,
  province    TEXT,
  region      TEXT,
  type        TEXT,                       -- park | stadium | landmark | other
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
