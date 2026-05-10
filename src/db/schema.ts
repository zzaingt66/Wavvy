import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const songStatusEnum = pgEnum("song_status", ["draft", "scheduled", "published", "archived"]);

export const schemaTypeEnum = pgEnum("schema_type", ["MusicRecording", "MusicComposition", "CreativeWork"]);

export const contributorRoleEnum = pgEnum("contributor_role", [
  "feat",
  "producer",
  "composer",
  "lyricist",
  "engineer",
  "mix",
  "master"
]);

export const platformEnum = pgEnum("music_platform", ["spotify", "apple_music", "youtube_music", "deezer", "tidal", "other"]);

export const cmsGenres = pgTable(
  "cms_genres",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("genres_name_uq").on(table.name)]
);

export const cmsSongs = pgTable(
  "cms_songs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 60 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    subtitle: varchar("subtitle", { length: 90 }),
    description: text("description").notNull(),
    lyrics: text("lyrics"),
    releaseDate: date("release_date").notNull(),
    genreId: integer("genre_id")
      .notNull()
      .references(() => cmsGenres.id, { onDelete: "restrict" }),
    bpm: integer("bpm"),
    musicalKey: varchar("musical_key", { length: 16 }),
    durationSec: integer("duration_sec"),
    isrc: varchar("isrc", { length: 12 }),
    releaseNotes: text("release_notes"),
    technicalCredits: text("technical_credits"),
    metaTitle: varchar("meta_title", { length: 60 }),
    metaDescription: varchar("meta_description", { length: 160 }),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    noindex: boolean("noindex").notNull().default(false),
    schemaType: schemaTypeEnum("schema_type").notNull().default("MusicRecording"),
    status: songStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("songs_slug_uq").on(table.slug),
    index("songs_status_scheduled_idx").on(table.status, table.scheduledAt),
    index("songs_published_idx").on(table.publishedAt),
    check("songs_title_len_check", sql`char_length(${table.title}) <= 60`),
    check("songs_desc_min_check", sql`char_length(${table.description}) >= 150`)
  ]
);

export const songAudioAssets = pgTable(
  "cms_song_audio_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    mp3Url: text("mp3_url").notNull(),
    oggUrl: text("ogg_url").notNull(),
    bitrateKbps: integer("bitrate_kbps").notNull().default(320),
    durationSec: integer("duration_sec"),
    waveform: jsonb("waveform").$type<number[]>(),
    waveformStatus: varchar("waveform_status", { length: 20 }).notNull().default("pending"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("song_audio_assets_song_uq").on(table.songId),
    check("song_audio_assets_bitrate_check", sql`${table.bitrateKbps} >= 128`)
  ]
);

export const cmsTags = pgTable(
  "cms_tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 60 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("tags_slug_uq").on(table.slug)]
);

export const songTags = pgTable(
  "cms_song_tags",
  {
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => cmsTags.id, { onDelete: "cascade" })
  },
  (table) => [primaryKey({ columns: [table.songId, table.tagId] })]
);

export const songContributors = pgTable(
  "cms_song_contributors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    role: contributorRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("song_contributors_song_idx").on(table.songId)]
);

export const songPlatformLinks = pgTable(
  "cms_song_platform_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("song_platform_links_song_idx").on(table.songId)]
);

export const songKeywords = pgTable(
  "cms_song_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    keyword: varchar("keyword", { length: 80 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("song_keywords_song_idx").on(table.songId), index("song_keywords_kw_idx").on(table.keyword)]
);

export const songVersions = pgTable(
  "cms_song_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    snapshotJson: jsonb("snapshot_json").notNull(),
    changeNote: varchar("change_note", { length: 180 }),
    createdBy: varchar("created_by", { length: 100 }).notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("song_versions_song_number_uq").on(table.songId, table.versionNumber)]
);

export const songAutosaves = pgTable(
  "cms_song_autosaves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    payloadJson: jsonb("payload_json").notNull(),
    savedBy: varchar("saved_by", { length: 100 }).notNull().default("editor"),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("song_autosaves_song_saved_idx").on(table.songId, table.savedAt)]
);

export const waveformJobs = pgTable(
  "cms_waveform_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => cmsSongs.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    tries: integer("tries").notNull().default(0),
    error: text("error"),
    runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("waveform_jobs_status_run_idx").on(table.status, table.runAfter)]
);

export const musicAnalyticsEvents = pgTable(
  "cms_music_analytics_events",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    songId: uuid("song_id").references(() => cmsSongs.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).defaultNow().notNull(),
    payload: jsonb("payload")
  },
  (table) => [index("music_events_song_time_idx").on(table.songId, table.eventAt)]
);

export type SongStatus = (typeof songStatusEnum.enumValues)[number];
