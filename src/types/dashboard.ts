export interface DateRange {
  from: string;
  to: string;
}

export interface SeoKeywordRow {
  keyword: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
}

export interface PositionBuckets {
  top3: number;
  top10: number;
  top100: number;
}

export interface CtrPageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface IndexingVelocityRow {
  songId: number;
  hoursToIndex: number;
}

export interface CwvRow {
  day: string;
  lcp: number;
  inp: number;
  cls: number;
}

export interface SongPlayRow {
  songId: number;
  title: string;
  playsRange: number;
  plays7d: number;
  plays30d: number;
}

export interface ListeningQualityRow {
  songId: number;
  title: string;
  durationSec: number;
  avgListenSec: number;
  completionRate: number;
}

export interface SourceRow {
  source: string;
  plays: number;
}

export interface HeatmapRow {
  hour: number;
  plays: number;
}

export interface DeviceBrowserRow {
  deviceType: string;
  browser: string;
  plays: number;
}

export interface PublicationRow {
  songId: number;
  title: string;
  status: string;
  indexedKeywords: number;
  backlinks: number;
  comments: number;
  shares: number;
}

export interface SeoPayload {
  organicByKeyword: SeoKeywordRow[];
  positions: PositionBuckets;
  ctrByPage: CtrPageRow[];
  indexingVelocity: IndexingVelocityRow[];
  cwvHistory: CwvRow[];
}

export interface MusicPayload {
  playsBySong: SongPlayRow[];
  listeningQuality: ListeningQualityRow[];
  trafficSources: SourceRow[];
  hourlyHeatmap: HeatmapRow[];
  devicesBrowsers: DeviceBrowserRow[];
}

export interface PublicationPayload {
  publications: PublicationRow[];
}
