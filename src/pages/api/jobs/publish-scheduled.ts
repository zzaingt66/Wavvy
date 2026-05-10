import type { APIRoute } from "astro";

import { runScheduledPublishing } from "../../../actions/songs";

const JOB_TOKEN = process.env.JOBS_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (!JOB_TOKEN || request.headers.get("x-jobs-secret") !== JOB_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }

  const count = await runScheduledPublishing(new Date());
  return new Response(JSON.stringify({ ok: true, published: count }), { status: 200 });
};
