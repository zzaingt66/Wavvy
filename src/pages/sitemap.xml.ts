import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { cmsSongs } from "../db/schema";

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ site }) => {
  const db = getDb();
  const origin = site?.origin ?? process.env.SITE_URL ?? "https://example.com";

  const songs = await db
    .select({
      slug: cmsSongs.slug,
      canonicalUrl: cmsSongs.canonicalUrl,
      updatedAt: cmsSongs.updatedAt,
      publishedAt: cmsSongs.publishedAt
    })
    .from(cmsSongs)
    .where(and(eq(cmsSongs.status, "published"), eq(cmsSongs.noindex, false)))
    .orderBy(desc(cmsSongs.publishedAt));

  const urls = songs
    .map((song) => {
      const loc = song.canonicalUrl || `${origin.replace(/\/$/, "")}/songs/${song.slug}`;
      const lastmod = (song.updatedAt ?? song.publishedAt ?? new Date()).toISOString();
      return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    })
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900"
    }
  });
};
