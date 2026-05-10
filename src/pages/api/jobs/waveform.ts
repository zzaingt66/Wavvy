import type { APIRoute } from "astro";
import { and, asc, eq, lte } from "drizzle-orm";

import { getDb } from "../../../db/client";
import { songAudioAssets, waveformJobs } from "../../../db/schema";
import { generateWaveformFromSource } from "../../../lib/cms/waveform";

const JOB_TOKEN = process.env.JOBS_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (!JOB_TOKEN || request.headers.get("x-jobs-secret") !== JOB_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }

  const db = getDb();
  const [job] = await db
    .select()
    .from(waveformJobs)
    .where(and(eq(waveformJobs.status, "queued"), lte(waveformJobs.runAfter, new Date())))
    .orderBy(asc(waveformJobs.runAfter))
    .limit(1);

  if (!job) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  await db.update(waveformJobs).set({ status: "processing", updatedAt: new Date() }).where(eq(waveformJobs.id, job.id));

  try {
    const [asset] = await db.select().from(songAudioAssets).where(eq(songAudioAssets.songId, job.songId)).limit(1);
    if (!asset?.mp3Url || !asset?.oggUrl) {
      throw new Error("Missing audio sources for waveform generation.");
    }

    const waveform = generateWaveformFromSource(`${asset.mp3Url}|${asset.oggUrl}`);

    await db
      .update(songAudioAssets)
      .set({ waveform, waveformStatus: "ready", updatedAt: new Date() })
      .where(eq(songAudioAssets.songId, job.songId));

    await db.update(waveformJobs).set({ status: "done", updatedAt: new Date() }).where(eq(waveformJobs.id, job.id));

    return new Response(JSON.stringify({ ok: true, processed: 1, jobId: job.id }), { status: 200 });
  } catch (error) {
    const tries = job.tries + 1;
    await db
      .update(waveformJobs)
      .set({
        status: tries >= 5 ? "failed" : "queued",
        tries,
        error: error instanceof Error ? error.message : "Unknown error",
        runAfter: new Date(Date.now() + 1000 * 30),
        updatedAt: new Date()
      })
      .where(eq(waveformJobs.id, job.id));

    return new Response(JSON.stringify({ ok: false, error: "Waveform job failed" }), { status: 500 });
  }
};
