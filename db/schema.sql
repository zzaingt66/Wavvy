CREATE TABLE songs (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  duration_sec INT NOT NULL CHECK (duration_sec > 0),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pages (
  id BIGSERIAL PRIMARY KEY,
  song_id BIGINT REFERENCES songs(id) ON DELETE CASCADE,
  url TEXT UNIQUE NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('song', 'artist', 'landing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seo_keyword_daily (
  day DATE NOT NULL,
  song_id BIGINT REFERENCES songs(id) ON DELETE CASCADE,
  page_id BIGINT REFERENCES pages(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  avg_position NUMERIC(6, 2),
  ctr NUMERIC(6, 4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN clicks::numeric / impressions ELSE 0 END
  ) STORED,
  PRIMARY KEY (day, page_id, keyword)
);

CREATE TABLE publication_indexing (
  song_id BIGINT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
  page_id BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ,
  first_indexed_at TIMESTAMPTZ,
  indexing_status TEXT NOT NULL CHECK (indexing_status IN ('pending', 'indexed', 'excluded', 'error')),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core_web_vitals_daily (
  day DATE NOT NULL,
  page_id BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  lcp_ms_p75 INT,
  inp_ms_p75 INT,
  cls_p75 NUMERIC(8, 4),
  ttfb_ms_p75 INT,
  fcp_ms_p75 INT,
  PRIMARY KEY (day, page_id)
);

CREATE TABLE song_consumption_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  plays_total INT NOT NULL DEFAULT 0,
  listen_time_sec BIGINT NOT NULL DEFAULT 0,
  completed_plays INT NOT NULL DEFAULT 0,
  avg_listen_sec NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE WHEN plays_total > 0 THEN listen_time_sec::numeric / plays_total ELSE 0 END
  ) STORED,
  completion_rate NUMERIC(6, 4) GENERATED ALWAYS AS (
    CASE WHEN plays_total > 0 THEN completed_plays::numeric / plays_total ELSE 0 END
  ) STORED,
  PRIMARY KEY (day, song_id)
);

CREATE TABLE song_traffic_source_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  plays INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id, source)
);

CREATE TABLE song_listen_heatmap_hourly (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  hour_of_day SMALLINT NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  plays INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id, hour_of_day)
);

CREATE TABLE song_device_browser_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  browser TEXT NOT NULL,
  plays INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id, device_type, browser)
);

CREATE TABLE song_indexed_keywords_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  indexed_keywords INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id)
);

CREATE TABLE song_backlinks_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  backlinks_total INT NOT NULL DEFAULT 0,
  referring_domains INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id)
);

CREATE TABLE song_engagement_daily (
  day DATE NOT NULL,
  song_id BIGINT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, song_id)
);

CREATE INDEX idx_seo_keyword_day_song ON seo_keyword_daily(day, song_id);
CREATE INDEX idx_seo_keyword_keyword ON seo_keyword_daily(keyword);
CREATE INDEX idx_consumption_day_song ON song_consumption_daily(day, song_id);
CREATE INDEX idx_heatmap_song_day ON song_listen_heatmap_hourly(song_id, day);
CREATE INDEX idx_cwv_day_page ON core_web_vitals_daily(day, page_id);

CREATE TYPE song_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
CREATE TYPE schema_type AS ENUM ('MusicRecording', 'MusicComposition', 'CreativeWork');
CREATE TYPE contributor_role AS ENUM ('feat', 'producer', 'composer', 'lyricist', 'engineer', 'mix', 'master');
CREATE TYPE music_platform AS ENUM ('spotify', 'apple_music', 'youtube_music', 'deezer', 'tidal', 'other');

CREATE TABLE cms_genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cms_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(60) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  subtitle VARCHAR(90),
  description TEXT NOT NULL,
  lyrics TEXT,
  release_date DATE NOT NULL,
  genre_id INT NOT NULL REFERENCES cms_genres(id) ON DELETE RESTRICT,
  bpm INT,
  musical_key VARCHAR(16),
  duration_sec INT,
  isrc VARCHAR(12),
  release_notes TEXT,
  technical_credits TEXT,
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  og_image_url TEXT,
  canonical_url TEXT,
  noindex BOOLEAN NOT NULL DEFAULT false,
  schema_type schema_type NOT NULL DEFAULT 'MusicRecording',
  status song_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_songs_title_len_check CHECK (char_length(title) <= 60),
  CONSTRAINT cms_songs_desc_min_check CHECK (char_length(description) >= 150)
);

CREATE INDEX cms_songs_status_scheduled_idx ON cms_songs(status, scheduled_at);
CREATE INDEX cms_songs_published_idx ON cms_songs(published_at);

CREATE TABLE cms_song_audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL UNIQUE REFERENCES cms_songs(id) ON DELETE CASCADE,
  mp3_url TEXT NOT NULL,
  ogg_url TEXT NOT NULL,
  bitrate_kbps INT NOT NULL DEFAULT 320,
  duration_sec INT,
  waveform JSONB,
  waveform_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_song_audio_assets_bitrate_check CHECK (bitrate_kbps >= 128)
);

CREATE TABLE cms_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cms_song_tags (
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES cms_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, tag_id)
);

CREATE TABLE cms_song_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  role contributor_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_song_contributors_song_idx ON cms_song_contributors(song_id);

CREATE TABLE cms_song_platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  platform music_platform NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_song_platform_links_song_idx ON cms_song_platform_links(song_id);

CREATE TABLE cms_song_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  keyword VARCHAR(80) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_song_keywords_song_idx ON cms_song_keywords(song_id);
CREATE INDEX cms_song_keywords_kw_idx ON cms_song_keywords(keyword);

CREATE TABLE cms_song_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot_json JSONB NOT NULL,
  change_note VARCHAR(180),
  created_by VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (song_id, version_number)
);

CREATE TABLE cms_song_autosaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  payload_json JSONB NOT NULL,
  saved_by VARCHAR(100) NOT NULL DEFAULT 'editor',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_song_autosaves_song_saved_idx ON cms_song_autosaves(song_id, saved_at);

CREATE TABLE cms_waveform_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES cms_songs(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  tries INT NOT NULL DEFAULT 0,
  error TEXT,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_waveform_jobs_status_run_idx ON cms_waveform_jobs(status, run_after);

CREATE TABLE cms_music_analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  song_id UUID REFERENCES cms_songs(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

CREATE INDEX cms_music_events_song_time_idx ON cms_music_analytics_events(song_id, event_at);
