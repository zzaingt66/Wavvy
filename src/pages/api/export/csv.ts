import type { APIRoute } from "astro";
import { parseDateRange } from "../../../lib/dateRange";
import { getDashboardData } from "../../../lib/queries";

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const line = headers
      .map((header) => {
        const value = String(row[header] ?? "").replaceAll('"', '""');
        return `"${value}"`;
      })
      .join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

export const GET: APIRoute = async ({ url }) => {
  const range = parseDateRange(url);
  const data = await getDashboardData(range);

  const rows: Array<Record<string, string | number>> = [];

  for (const row of data.seo.organicByKeyword) {
    rows.push({
      section: "seo_keyword",
      keyword: row.keyword,
      clicks: row.clicks,
      impressions: row.impressions,
      avgPosition: row.avgPosition
    });
  }

  for (const row of data.music.playsBySong) {
    rows.push({
      section: "music_plays",
      song: row.title,
      playsRange: row.playsRange,
      plays7d: row.plays7d,
      plays30d: row.plays30d
    });
  }

  for (const row of data.publications.publications) {
    rows.push({
      section: "publication",
      song: row.title,
      indexingStatus: row.status,
      indexedKeywords: row.indexedKeywords,
      backlinks: row.backlinks,
      comments: row.comments,
      shares: row.shares
    });
  }

  const csv = toCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dashboard-${range.from}-${range.to}.csv"`
    }
  });
};
