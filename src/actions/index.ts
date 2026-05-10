import { defineAction } from "astro:actions";

import {
  createSongSchema,
  songDeleteSchema,
  songDraftAutosaveSchema,
  songPublishSchema,
  updateSongSchema,
  uploadConfirmSchema,
  uploadRequestSchema
} from "../schemas/song";
import {
  archiveSong,
  autosaveSong,
  createSong,
  removeSong,
  updateSong,
  publishSong
} from "./songs";
import { confirmAudioUpload, requestAudioUpload } from "./uploads";
import { validateSeo } from "../lib/cms/seo";

export const server = {
  createSong: defineAction({
    accept: "json",
    input: createSongSchema,
    handler: async (input) => createSong(input)
  }),
  updateSong: defineAction({
    accept: "json",
    input: updateSongSchema,
    handler: async ({ songId, ...payload }) => updateSong(songId, createSongSchema.parse(payload))
  }),
  autosaveSongDraft: defineAction({
    accept: "json",
    input: songDraftAutosaveSchema,
    handler: async ({ songId, payload }) => {
      await autosaveSong(songId, payload, "editor");
      return { ok: true, savedAt: new Date().toISOString() };
    }
  }),
  publishSong: defineAction({
    accept: "json",
    input: songPublishSchema,
    handler: async (input) =>
      publishSong({
        songId: input.songId,
        publishNow: input.publishNow,
        scheduledAt: input.scheduledAt,
        changeNote: input.changeNote,
        editor: input.editor
      })
  }),
  archiveSong: defineAction({
    accept: "json",
    input: songDeleteSchema,
    handler: async ({ songId }) => {
      await archiveSong(songId);
      return { ok: true };
    }
  }),
  deleteSong: defineAction({
    accept: "json",
    input: songDeleteSchema,
    handler: async ({ songId }) => {
      await removeSong(songId);
      return { ok: true };
    }
  }),
  requestAudioUpload: defineAction({
    accept: "json",
    input: uploadRequestSchema,
    handler: async (input) => requestAudioUpload(input)
  }),
  confirmAudioUpload: defineAction({
    accept: "json",
    input: uploadConfirmSchema,
    handler: async (input) => {
      await confirmAudioUpload(input);
      return { ok: true };
    }
  }),
  validateSeo: defineAction({
    accept: "json",
    input: createSongSchema.partial(),
    handler: async (input) =>
      validateSeo({
        title: input.metaTitle || input.title || "",
        description: input.metaDescription || input.description || "",
        slug: input.slug || "",
        canonicalUrl: input.canonicalUrl || null,
        ogImageUrl: input.ogImageUrl || null,
        noindex: input.noindex || false,
        keywords: input.keywords || []
      })
  })
};
