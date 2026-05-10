import { runQuery } from "./db";
import type {
  CtrPageRow,
  CwvRow,
  DateRange,
  DeviceBrowserRow,
  HeatmapRow,
  IndexingVelocityRow,
  ListeningQualityRow,
  MusicPayload,
  PositionBuckets,
  PublicationPayload,
  PublicationRow,
  SeoKeywordRow,
  SeoPayload,
  SongPlayRow,
  SourceRow
} from "../types/dashboard";

export async function getSeoPayload(range: DateRange): Promise<SeoPayload> {
  const [organicByKeyword, positionsRows, ctrByPage, indexingVelocity, cwvHistory] = await Promise.all([
    runQuery<SeoKeywordRow>(
      `
        SELECT keyword,
               SUM(clicks)::int AS clicks,
               SUM(impressions)::int AS impressions,
               ROUND(AVG(avg_position), 2)::float AS "avgPosition"
        FROM seo_keyword_daily
        WHERE day BETWEEN $1 AND $2
        GROUP BY keyword
        ORDER BY clicks DESC
        LIMIT 20
      `,
      [range.from, range.to]
    ),
    runQuery<PositionBuckets>(
      `
        SELECT
          SUM(CASE WHEN avg_position <= 3 THEN 1 ELSE 0 END)::int AS top3,
          SUM(CASE WHEN avg_position > 3 AND avg_position <= 10 THEN 1 ELSE 0 END)::int AS top10,
          SUM(CASE WHEN avg_position > 10 AND avg_position <= 100 THEN 1 ELSE 0 END)::int AS top100
        FROM seo_keyword_daily
        WHERE day BETWEEN $1 AND $2
      `,
      [range.from, range.to]
    ),
    runQuery<CtrPageRow>(
      `
        SELECT p.url,
               SUM(s.clicks)::int AS clicks,
               SUM(s.impressions)::int AS impressions,
               ROUND(
                 CASE WHEN SUM(s.impressions) > 0
                   THEN SUM(s.clicks)::numeric / SUM(s.impressions)
                   ELSE 0
                 END,
                 4
               )::float AS ctr
        FROM seo_keyword_daily s
        JOIN pages p ON p.id = s.page_id
        WHERE s.day BETWEEN $1 AND $2
          AND p.page_type = 'song'
        GROUP BY p.url
        ORDER BY ctr DESC
        LIMIT 20
      `,
      [range.from, range.to]
    ),
    runQuery<IndexingVelocityRow>(
      `
        SELECT song_id AS "songId",
               ROUND(EXTRACT(EPOCH FROM (first_indexed_at - submitted_at)) / 3600.0, 2)::float AS "hoursToIndex"
        FROM publication_indexing
        WHERE submitted_at IS NOT NULL
          AND first_indexed_at IS NOT NULL
        ORDER BY "hoursToIndex" ASC
        LIMIT 20
      `
    ),
    runQuery<CwvRow>(
      `
        SELECT day::text,
               AVG(lcp_ms_p75)::float AS lcp,
               AVG(inp_ms_p75)::float AS inp,
               AVG(cls_p75)::float AS cls
        FROM core_web_vitals_daily
        WHERE day BETWEEN $1 AND $2
        GROUP BY day
        ORDER BY day ASC
      `,
      [range.from, range.to]
    )
  ]);

  return {
    organicByKeyword: organicByKeyword.length > 0 ? organicByKeyword : mockSeo().organicByKeyword,
    positions: positionsRows[0] ?? mockSeo().positions,
    ctrByPage: ctrByPage.length > 0 ? ctrByPage : mockSeo().ctrByPage,
    indexingVelocity: indexingVelocity.length > 0 ? indexingVelocity : mockSeo().indexingVelocity,
    cwvHistory: cwvHistory.length > 0 ? cwvHistory : mockSeo().cwvHistory
  };
}

export async function getMusicPayload(range: DateRange): Promise<MusicPayload> {
  const [playsBySong, listeningQuality, trafficSources, hourlyHeatmap, devicesBrowsers] = await Promise.all([
    runQuery<SongPlayRow>(
      `
        SELECT c.song_id AS "songId",
               s.title,
               SUM(c.plays_total)::int AS "playsRange",
               SUM(c.plays_total) FILTER (WHERE c.day >= CURRENT_DATE - INTERVAL '7 days')::int AS "plays7d",
               SUM(c.plays_total) FILTER (WHERE c.day >= CURRENT_DATE - INTERVAL '30 days')::int AS "plays30d"
        FROM song_consumption_daily c
        JOIN songs s ON s.id = c.song_id
        WHERE c.day BETWEEN $1 AND $2
        GROUP BY c.song_id, s.title
        ORDER BY "playsRange" DESC
      `,
      [range.from, range.to]
    ),
    runQuery<ListeningQualityRow>(
      `
        SELECT c.song_id AS "songId",
               s.title,
               s.duration_sec AS "durationSec",
               ROUND(AVG(c.avg_listen_sec), 2)::float AS "avgListenSec",
               ROUND(AVG(c.completion_rate), 4)::float AS "completionRate"
        FROM song_consumption_daily c
        JOIN songs s ON s.id = c.song_id
        WHERE c.day BETWEEN $1 AND $2
        GROUP BY c.song_id, s.title, s.duration_sec
        ORDER BY "completionRate" DESC
      `,
      [range.from, range.to]
    ),
    runQuery<SourceRow>(
      `
        SELECT source, SUM(plays)::int AS plays
        FROM song_traffic_source_daily
        WHERE day BETWEEN $1 AND $2
        GROUP BY source
        ORDER BY plays DESC
      `,
      [range.from, range.to]
    ),
    runQuery<HeatmapRow>(
      `
        SELECT hour_of_day AS hour, SUM(plays)::int AS plays
        FROM song_listen_heatmap_hourly
        WHERE day BETWEEN $1 AND $2
        GROUP BY hour_of_day
        ORDER BY hour_of_day ASC
      `,
      [range.from, range.to]
    ),
    runQuery<DeviceBrowserRow>(
      `
        SELECT device_type AS "deviceType", browser, SUM(plays)::int AS plays
        FROM song_device_browser_daily
        WHERE day BETWEEN $1 AND $2
        GROUP BY device_type, browser
        ORDER BY plays DESC
      `,
      [range.from, range.to]
    )
  ]);

  return {
    playsBySong: playsBySong.length > 0 ? playsBySong : mockMusic().playsBySong,
    listeningQuality: listeningQuality.length > 0 ? listeningQuality : mockMusic().listeningQuality,
    trafficSources: trafficSources.length > 0 ? trafficSources : mockMusic().trafficSources,
    hourlyHeatmap: hourlyHeatmap.length > 0 ? hourlyHeatmap : mockMusic().hourlyHeatmap,
    devicesBrowsers: devicesBrowsers.length > 0 ? devicesBrowsers : mockMusic().devicesBrowsers
  };
}

export async function getPublicationPayload(range: DateRange): Promise<PublicationPayload> {
  const publications = await runQuery<PublicationRow>(
    `
      SELECT s.id AS "songId",
             s.title,
             p.indexing_status AS status,
             COALESCE(k.indexed_keywords, 0)::int AS "indexedKeywords",
             COALESCE(b.backlinks_total, 0)::int AS backlinks,
             COALESCE(e.comments_count, 0)::int AS comments,
             COALESCE(e.shares_count, 0)::int AS shares
      FROM songs s
      LEFT JOIN publication_indexing p ON p.song_id = s.id
      LEFT JOIN LATERAL (
        SELECT indexed_keywords
        FROM song_indexed_keywords_daily x
        WHERE x.song_id = s.id
          AND x.day BETWEEN $1 AND $2
        ORDER BY x.day DESC
        LIMIT 1
      ) k ON true
      LEFT JOIN LATERAL (
        SELECT backlinks_total
        FROM song_backlinks_daily x
        WHERE x.song_id = s.id
          AND x.day BETWEEN $1 AND $2
        ORDER BY x.day DESC
        LIMIT 1
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT comments_count, shares_count
        FROM song_engagement_daily x
        WHERE x.song_id = s.id
          AND x.day BETWEEN $1 AND $2
        ORDER BY x.day DESC
        LIMIT 1
      ) e ON true
      ORDER BY s.published_at DESC
    `,
    [range.from, range.to]
  );

  return {
    publications: publications.length > 0 ? publications : mockPublications().publications
  };
}

export async function getDashboardData(range: DateRange): Promise<{
  seo: SeoPayload;
  music: MusicPayload;
  publications: PublicationPayload;
}> {
  const [seo, music, publications] = await Promise.all([
    getSeoPayload(range),
    getMusicPayload(range),
    getPublicationPayload(range)
  ]);

  return { seo, music, publications };
}

function mockSeo(): SeoPayload {
  return {
    organicByKeyword: [
      { keyword: "indie pop nuevo", clicks: 1250, impressions: 9521, avgPosition: 4.3 },
      { keyword: "musica alternativa latina", clicks: 890, impressions: 8004, avgPosition: 7.1 },
      { keyword: "cancion chill estreno", clicks: 642, impressions: 5222, avgPosition: 8.4 }
    ],
    positions: { top3: 14, top10: 45, top100: 128 },
    ctrByPage: [
      { url: "/songs/aurora", clicks: 520, impressions: 3020, ctr: 0.1722 },
      { url: "/songs/marea-lenta", clicks: 430, impressions: 2800, ctr: 0.1535 }
    ],
    indexingVelocity: [
      { songId: 1, hoursToIndex: 2.3 },
      { songId: 2, hoursToIndex: 4.8 },
      { songId: 3, hoursToIndex: 7.2 }
    ],
    cwvHistory: [
      { day: "2026-05-01", lcp: 1480, inp: 112, cls: 0.06 },
      { day: "2026-05-02", lcp: 1430, inp: 108, cls: 0.05 },
      { day: "2026-05-03", lcp: 1390, inp: 104, cls: 0.05 },
      { day: "2026-05-04", lcp: 1340, inp: 98, cls: 0.04 }
    ]
  };
}

function mockMusic(): MusicPayload {
  return {
    playsBySong: [
      { songId: 1, title: "Aurora", playsRange: 12840, plays7d: 2840, plays30d: 9850 },
      { songId: 2, title: "Marea Lenta", playsRange: 9840, plays7d: 2140, plays30d: 8120 }
    ],
    listeningQuality: [
      { songId: 1, title: "Aurora", durationSec: 214, avgListenSec: 176.4, completionRate: 0.61 },
      { songId: 2, title: "Marea Lenta", durationSec: 196, avgListenSec: 141.2, completionRate: 0.54 }
    ],
    trafficSources: [
      { source: "organic", plays: 8420 },
      { source: "social", plays: 5210 },
      { source: "direct", plays: 2140 }
    ],
    hourlyHeatmap: [
      { hour: 9, plays: 210 },
      { hour: 12, plays: 430 },
      { hour: 18, plays: 670 },
      { hour: 22, plays: 720 }
    ],
    devicesBrowsers: [
      { deviceType: "mobile", browser: "Chrome", plays: 6800 },
      { deviceType: "desktop", browser: "Chrome", plays: 2100 },
      { deviceType: "mobile", browser: "Safari", plays: 1840 }
    ]
  };
}

function mockPublications(): PublicationPayload {
  return {
    publications: [
      {
        songId: 1,
        title: "Aurora",
        status: "indexed",
        indexedKeywords: 42,
        backlinks: 18,
        comments: 36,
        shares: 121
      },
      {
        songId: 2,
        title: "Marea Lenta",
        status: "pending",
        indexedKeywords: 17,
        backlinks: 8,
        comments: 12,
        shares: 48
      }
    ]
  };
}
