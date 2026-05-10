import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";

import { getDb } from "../db/client";
import {
  cmsGenres,
  cmsSongs,
  cmsTags,
  contributorRoleEnum,
  platformEnum,
  schemaTypeEnum,
  songAudioAssets,
  songAutosaves,
  songContributors,
  songKeywords,
  songPlatformLinks,
  songTags,
  songVersions,
  waveformJobs,
  type SongStatus
} from "../db/schema";
import { songInputSchema } from "../schemas/song";
import { buildUniqueSlug, slugify } from "../lib/cms/slug";

type SongInput = z.infer<typeof songInputSchema>;

async function ensureUniqueSlug(desired: string, excludeSongId?: string): Promise<string> {
  const db = getDb();
  const rows = excludeSongId
    ? await db.select({ slug: cmsSongs.slug }).from(cmsSongs).where(sql`${cmsSongs.id} <> ${excludeSongId}`)
    : await db.select({ slug: cmsSongs.slug }).from(cmsSongs);

  const set = new Set(rows.map((row) => row.slug));
  return buildUniqueSlug(desired, set);
}

async function upsertTags(songId: string, tags: string[]): Promise<void> {
  const db = getDb();
  await db.delete(songTags).where(eq(songTags.songId, songId));
  if (tags.length === 0) {
    return;
  }

  const normalized = Array.from(new Set(tags.map((item) => item.trim()).filter(Boolean)));
  if (normalized.length === 0) {
    return;
  }

  for (const name of normalized) {
    const slug = slugify(name);
    await db
      .insert(cmsTags)
      .values({ name, slug })
      .onConflictDoUpdate({ target: cmsTags.slug, set: { name } });
  }

  const tagRows = await db.select({ id: cmsTags.id }).from(cmsTags).where(inArray(cmsTags.slug, normalized.map(slugify)));
  if (tagRows.length > 0) {
    await db.insert(songTags).values(tagRows.map((tag) => ({ songId, tagId: tag.id })));
  }
}

async function replaceRelations(songId: string, input: SongInput): Promise<void> {
  const db = getDb();

  await db.delete(songContributors).where(eq(songContributors.songId, songId));
  if (input.contributors.length > 0) {
    await db.insert(songContributors).values(
      input.contributors.map((item) => ({
        songId,
        name: item.name,
        role: item.role
      }))
    );
  }

  await db.delete(songPlatformLinks).where(eq(songPlatformLinks.songId, songId));
  if (input.platformLinks.length > 0) {
    await db.insert(songPlatformLinks).values(
      input.platformLinks.map((item) => ({
        songId,
        platform: item.platform,
        url: item.url
      }))
    );
  }

  await db.delete(songKeywords).where(eq(songKeywords.songId, songId));
  if (input.keywords.length > 0) {
    await db.insert(songKeywords).values(
      input.keywords.map((item) => ({
        songId,
        keyword: item.keyword,
        isPrimary: item.isPrimary ?? false
      }))
    );
  }

  await upsertTags(songId, input.tags);
}

async function createVersion(songId: string, snapshot: SongInput, changeNote: string | null, createdBy: string): Promise<void> {
  const db = getDb();
  const current = await db
    .select({ versionNumber: songVersions.versionNumber })
    .from(songVersions)
    .where(eq(songVersions.songId, songId))
    .orderBy(desc(songVersions.versionNumber))
    .limit(1);

  const nextVersion = (current[0]?.versionNumber ?? 0) + 1;
  await db.insert(songVersions).values({
    songId,
    versionNumber: nextVersion,
    snapshotJson: snapshot,
    changeNote: changeNote ?? null,
    createdBy
  });
}

export async function createSong(input: SongInput): Promise<{ songId: string; slug: string }> {
  const db = getDb();
  const slug = await ensureUniqueSlug(input.slug || input.title);

  const [song] = await db
    .insert(cmsSongs)
    .values({
      title: input.title,
      slug,
      subtitle: input.subtitle ?? null,
      description: input.description,
      lyrics: input.lyrics ?? null,
      releaseDate: input.releaseDate,
      genreId: input.genreId,
      bpm: input.bpm ?? null,
      musicalKey: input.musicalKey ?? null,
      durationSec: input.durationSec ?? null,
      isrc: input.isrc ?? null,
      releaseNotes: input.releaseNotes ?? null,
      technicalCredits: input.technicalCredits ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      noindex: input.noindex,
      schemaType: input.schemaType,
      status: "draft"
    })
    .returning({ id: cmsSongs.id, slug: cmsSongs.slug });

  await replaceRelations(song.id, input);

  if (input.mp3Url && input.oggUrl) {
    await db.insert(songAudioAssets).values({
      songId: song.id,
      mp3Url: input.mp3Url,
      oggUrl: input.oggUrl,
      bitrateKbps: input.bitrateKbps,
      durationSec: input.durationSec ?? null,
      waveformStatus: "queued"
    });

    await db.insert(waveformJobs).values({ songId: song.id, status: "queued" });
  }

  await createVersion(song.id, input, "Initial draft", "system");
  return { songId: song.id, slug: song.slug };
}

export async function updateSong(songId: string, input: SongInput): Promise<{ songId: string; slug: string }> {
  const db = getDb();
  const slug = await ensureUniqueSlug(input.slug || input.title, songId);

  await db
    .update(cmsSongs)
    .set({
      title: input.title,
      slug,
      subtitle: input.subtitle ?? null,
      description: input.description,
      lyrics: input.lyrics ?? null,
      releaseDate: input.releaseDate,
      genreId: input.genreId,
      bpm: input.bpm ?? null,
      musicalKey: input.musicalKey ?? null,
      durationSec: input.durationSec ?? null,
      isrc: input.isrc ?? null,
      releaseNotes: input.releaseNotes ?? null,
      technicalCredits: input.technicalCredits ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImageUrl: input.ogImageUrl ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      noindex: input.noindex,
      schemaType: input.schemaType,
      updatedAt: new Date()
    })
    .where(eq(cmsSongs.id, songId));

  await replaceRelations(songId, input);
  await createVersion(songId, input, "Content update", "editor");

  return { songId, slug };
}

export async function runScheduledPublishing(now = new Date()): Promise<number> {
  const db = getDb();
  const due = await db
    .select({ id: cmsSongs.id })
    .from(cmsSongs)
    .where(and(eq(cmsSongs.status, "scheduled"), sql`${cmsSongs.scheduledAt} <= ${now}`));

  if (due.length === 0) {
    return 0;
  }

  const ids = due.map((row) => row.id);
  await db
    .update(cmsSongs)
    .set({
      status: "published",
      publishedAt: now,
      scheduledAt: null,
      updatedAt: now
    })
    .where(inArray(cmsSongs.id, ids));

  return ids.length;
}

export async function autosaveSong(songId: string, payload: Partial<SongInput>, savedBy: string): Promise<void> {
  const db = getDb();
  await db.insert(songAutosaves).values({
    songId,
    payloadJson: payload,
    savedBy
  });
}

export async function publishSong(params: {
  songId: string;
  publishNow: boolean;
  scheduledAt?: string;
  changeNote?: string;
  editor: string;
}): Promise<{ status: SongStatus; publishedAt: string | null }> {
  const db = getDb();

  const [song] = await db
    .select({
      id: cmsSongs.id,
      title: cmsSongs.title,
      description: cmsSongs.description,
      noindex: cmsSongs.noindex
    })
    .from(cmsSongs)
    .where(eq(cmsSongs.id, params.songId))
    .limit(1);

  if (!song) {
    throw new Error("Song not found.");
  }

  const [audio] = await db
    .select({ mp3Url: songAudioAssets.mp3Url, oggUrl: songAudioAssets.oggUrl })
    .from(songAudioAssets)
    .where(eq(songAudioAssets.songId, params.songId))
    .limit(1);

  if (!audio?.mp3Url || !audio?.oggUrl) {
    throw new Error("Audio assets (mp3 + ogg) are required before publish.");
  }

  if (song.description.length < 150 || song.title.length > 60) {
    throw new Error("Song does not meet mandatory SEO constraints.");
  }

  if (params.publishNow) {
    await db
      .update(cmsSongs)
      .set({
        status: "published",
        scheduledAt: null,
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cmsSongs.id, params.songId));
    return { status: "published", publishedAt: new Date().toISOString() };
  }

  if (!params.scheduledAt) {
    throw new Error("scheduledAt is required when publishNow=false.");
  }

  const runAt = new Date(params.scheduledAt);
  if (Number.isNaN(runAt.getTime()) || runAt <= new Date()) {
    throw new Error("scheduledAt must be a valid future date.");
  }

  await db
    .update(cmsSongs)
    .set({
      status: "scheduled",
      scheduledAt: runAt,
      publishedAt: null,
      updatedAt: new Date()
    })
    .where(eq(cmsSongs.id, params.songId));

  return { status: "scheduled", publishedAt: null };
}

export async function archiveSong(songId: string): Promise<void> {
  const db = getDb();
  await db
    .update(cmsSongs)
    .set({
      status: "archived",
      scheduledAt: null,
      updatedAt: new Date()
    })
    .where(eq(cmsSongs.id, songId));
}

export async function removeSong(songId: string): Promise<void> {
  const db = getDb();
  await db.delete(cmsSongs).where(eq(cmsSongs.id, songId));
}

export async function listSongs(): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    status: SongStatus;
    updatedAt: Date;
  }>
> {
  const db = getDb();
  return db
    .select({
      id: cmsSongs.id,
      title: cmsSongs.title,
      slug: cmsSongs.slug,
      status: cmsSongs.status,
      updatedAt: cmsSongs.updatedAt
    })
    .from(cmsSongs)
    .orderBy(desc(cmsSongs.updatedAt));
}

export async function listGenres(): Promise<Array<{ id: number; name: string }>> {
  const db = getDb();
  const rows = await db.select({ id: cmsGenres.id, name: cmsGenres.name }).from(cmsGenres).orderBy(cmsGenres.name);
  return rows;
}

export interface SongEditorData {
  songId: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  releaseDate: string;
  genreId: number;
  lyrics: string;
  bpm: number | null;
  musicalKey: string;
  durationSec: number | null;
  isrc: string;
  releaseNotes: string;
  technicalCredits: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
  schemaType: (typeof schemaTypeEnum.enumValues)[number];
  tags: string[];
  contributors: Array<{ name: string; role: (typeof contributorRoleEnum.enumValues)[number] }>;
  platformLinks: Array<{ platform: (typeof platformEnum.enumValues)[number]; url: string }>;
  keywords: Array<{ keyword: string; isPrimary: boolean }>;
  mp3Url: string;
  oggUrl: string;
  bitrateKbps: number;
}

export async function getSongById(songId: string): Promise<SongEditorData | null> {
  const db = getDb();
  const [base] = await db
    .select()
    .from(cmsSongs)
    .where(eq(cmsSongs.id, songId))
    .limit(1);

  if (!base) {
    return null;
  }

  const [audio] = await db.select().from(songAudioAssets).where(eq(songAudioAssets.songId, songId)).limit(1);
  const contributorRows = await db.select().from(songContributors).where(eq(songContributors.songId, songId));
  const platformRows = await db.select().from(songPlatformLinks).where(eq(songPlatformLinks.songId, songId));
  const keywordRows = await db.select().from(songKeywords).where(eq(songKeywords.songId, songId));
  const tagRows = await db
    .select({ name: cmsTags.name })
    .from(songTags)
    .innerJoin(cmsTags, eq(songTags.tagId, cmsTags.id))
    .where(eq(songTags.songId, songId));

  return {
    songId: base.id,
    title: base.title,
    slug: base.slug,
    subtitle: base.subtitle ?? "",
    description: base.description,
    releaseDate: base.releaseDate,
    genreId: base.genreId,
    lyrics: base.lyrics ?? "",
    bpm: base.bpm,
    musicalKey: base.musicalKey ?? "",
    durationSec: base.durationSec,
    isrc: base.isrc ?? "",
    releaseNotes: base.releaseNotes ?? "",
    technicalCredits: base.technicalCredits ?? "",
    metaTitle: base.metaTitle ?? "",
    metaDescription: base.metaDescription ?? "",
    ogImageUrl: base.ogImageUrl ?? "",
    canonicalUrl: base.canonicalUrl ?? "",
    noindex: base.noindex,
    schemaType: base.schemaType,
    tags: tagRows.map((row) => row.name),
    contributors: contributorRows.map((row) => ({ name: row.name, role: row.role })),
    platformLinks: platformRows.map((row) => ({ platform: row.platform, url: row.url })),
    keywords: keywordRows.map((row) => ({ keyword: row.keyword, isPrimary: row.isPrimary })),
    mp3Url: audio?.mp3Url ?? "",
    oggUrl: audio?.oggUrl ?? "",
    bitrateKbps: audio?.bitrateKbps ?? 320
  };
}
