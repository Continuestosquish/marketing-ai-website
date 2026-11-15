CREATE TABLE IF NOT EXISTS drafts (
 id TEXT PRIMARY KEY,
 brief TEXT NOT NULL,
 session_id TEXT UNIQUE,
 result TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_drafts_session ON drafts(session_id);