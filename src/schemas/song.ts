import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

export const contributorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.enum(["feat", "producer", "composer", "lyricist", "engineer", "mix", "master"])
});

export const platformLinkSchema = z.object({
  platform: z.enum(["spotify", "apple_music", "youtube_music", "deezer", "tidal", "other"]),
  url: z.string().url()
});

export const songKeywordSchema = z.object({
  keyword: z.string().trim().min(2).max(80),
  isPrimary: z.boolean().default(false)
});

export const songInputSchema = z
  .object({
    title: z.string().trim().min(3).max(60),
    slug: z.string().trim().regex(slugRegex),
    subtitle: z.string().trim().max(90).optional().nullable(),
    description: z.string().trim().min(150),
    releaseDate: z.string().date(),
    genreId: z.number().int().positive(),
    lyrics: z.string().trim().optional().nullable(),
    bpm: z.number().int().min(30).max(260).optional().nullable(),
    musicalKey: z.string().trim().max(16).optional().nullable(),
    durationSec: z.number().int().min(1).max(3600).optional().nullable(),
    isrc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(isrcRegex)
      .optional()
      .nullable(),
    releaseNotes: z.string().trim().max(6000).optional().nullable(),
    technicalCredits: z.string().trim().max(6000).optional().nullable(),
    metaTitle: z.string().trim().max(60).optional().nullable(),
    metaDescription: z.string().trim().max(160).optional().nullable(),
    ogImageUrl: z.string().url().optional().nullable(),
    canonicalUrl: z.string().url().optional().nullable(),
    noindex: z.boolean().default(false),
    schemaType: z.enum(["MusicRecording", "MusicComposition", "CreativeWork"]).default("MusicRecording"),
    tags: z.array(z.string().trim().min(2).max(50)).default([]),
    contributors: z.array(contributorSchema).default([]),
    platformLinks: z.array(platformLinkSchema).default([]),
    keywords: z.array(songKeywordSchema).default([]),
    mp3Url: z.string().url().optional().nullable(),
    oggUrl: z.string().url().optional().nullable(),
    bitrateKbps: z.number().int().min(128).max(320).default(320)
  })
  .superRefine((value, ctx) => {
    const primaryCount = value.keywords.filter((item) => item.isPrimary).length;
    if (primaryCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keywords"],
        message: "Only one primary keyword is allowed."
      });
    }
  });

export const createSongSchema = songInputSchema;

export const updateSongSchema = songInputSchema.partial().extend({
  songId: z.string().uuid()
});

export const songDraftAutosaveSchema = z.object({
  songId: z.string().uuid(),
  payload: songInputSchema.partial()
});

export const songPublishSchema = z.object({
  songId: z.string().uuid(),
  publishNow: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional(),
  changeNote: z.string().max(180).optional(),
  editor: z.string().trim().max(100).default("editor")
});

export const songDeleteSchema = z.object({
  songId: z.string().uuid()
});

export const uploadRequestSchema = z.object({
  songId: z.string().uuid(),
  filename: z.string().trim().min(3),
  contentType: z.enum(["audio/mpeg", "audio/ogg"]),
  sizeBytes: z.number().int().positive().max(1024 * 1024 * 80)
});

export const uploadConfirmSchema = z.object({
  songId: z.string().uuid(),
  mp3Key: z.string().optional(),
  oggKey: z.string().optional(),
  bitrateKbps: z.number().int().min(128).max(320).default(320)
});
