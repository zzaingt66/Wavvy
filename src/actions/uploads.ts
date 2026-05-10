import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { cmsSongs, songAudioAssets, waveformJobs } from "../db/schema";
import { createPresignedUpload, objectUrl } from "../lib/cms/storage";

function extForContentType(type: "audio/mpeg" | "audio/ogg"): string {
  return type === "audio/mpeg" ? "mp3" : "ogg";
}

export async function requestAudioUpload(input: {
  songId: string;
  filename: string;
  contentType: "audio/mpeg" | "audio/ogg";
  sizeBytes: number;
}): Promise<{ key: string; uploadUrl: string }> {
  const db = getDb();

  const [song] = await db.select({ id: cmsSongs.id }).from(cmsSongs).where(eq(cmsSongs.id, input.songId)).limit(1);
  if (!song) {
    throw new Error("Song not found.");
  }

  const ext = extForContentType(input.contentType);
  const key = `songs/${input.songId}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "")}.${ext}`;
  const uploadUrl = await createPresignedUpload({
    key,
    contentType: input.contentType,
    expiresInSec: 900
  });

  return { key, uploadUrl };
}

export async function confirmAudioUpload(input: {
  songId: string;
  mp3Key?: string;
  oggKey?: string;
  bitrateKbps: number;
}): Promise<void> {
  const db = getDb();

  const mp3Url = input.mp3Key ? objectUrl(input.mp3Key) : null;
  const oggUrl = input.oggKey ? objectUrl(input.oggKey) : null;

  const [existing] = await db
    .select({ id: songAudioAssets.id, mp3Url: songAudioAssets.mp3Url, oggUrl: songAudioAssets.oggUrl })
    .from(songAudioAssets)
    .where(eq(songAudioAssets.songId, input.songId))
    .limit(1);

  if (existing) {
    await db
      .update(songAudioAssets)
      .set({
        mp3Url: mp3Url ?? existing.mp3Url,
        oggUrl: oggUrl ?? existing.oggUrl,
        bitrateKbps: input.bitrateKbps,
        waveformStatus: "queued",
        updatedAt: new Date()
      })
      .where(eq(songAudioAssets.songId, input.songId));
  } else {
    if (!mp3Url || !oggUrl) {
      throw new Error("Initial audio confirmation requires both mp3Key and oggKey.");
    }

    await db.insert(songAudioAssets).values({
      songId: input.songId,
      mp3Url,
      oggUrl,
      bitrateKbps: input.bitrateKbps,
      waveformStatus: "queued"
    });
  }

  const [job] = await db
    .select({ id: waveformJobs.id })
    .from(waveformJobs)
    .where(and(eq(waveformJobs.songId, input.songId), eq(waveformJobs.status, "queued")))
    .limit(1);

  if (!job) {
    await db.insert(waveformJobs).values({
      songId: input.songId,
      status: "queued"
    });
  }
}
