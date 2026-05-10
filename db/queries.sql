-- Trafico organico por keyword
SELECT keyword,
       SUM(clicks) AS clicks,
       SUM(impressions) AS impressions,
       ROUND(AVG(avg_position), 2) AS avg_position
FROM seo_keyword_daily
WHERE day BETWEEN $1 AND $2
GROUP BY keyword
ORDER BY clicks DESC
LIMIT 50;

-- Distribucion de posiciones Google
SELECT SUM(CASE WHEN avg_position <= 3 THEN 1 ELSE 0 END) AS top3,
       SUM(CASE WHEN avg_position > 3 AND avg_position <= 10 THEN 1 ELSE 0 END) AS top10,
       SUM(CASE WHEN avg_position > 10 AND avg_position <= 100 THEN 1 ELSE 0 END) AS top100
FROM seo_keyword_daily
WHERE day BETWEEN $1 AND $2;

-- CTR por pagina de cancion
SELECT p.url,
       SUM(s.clicks) AS clicks,
       SUM(s.impressions) AS impressions,
       ROUND(CASE
               WHEN SUM(s.impressions) > 0 THEN SUM(s.clicks)::numeric / SUM(s.impressions)
               ELSE 0
             END, 4) AS ctr
FROM seo_keyword_daily s
JOIN pages p ON p.id = s.page_id
WHERE s.day BETWEEN $1 AND $2
  AND p.page_type = 'song'
GROUP BY p.url
ORDER BY ctr DESC;

-- Velocidad de indexacion
SELECT song_id,
       EXTRACT(EPOCH FROM (first_indexed_at - submitted_at)) / 3600.0 AS hours_to_index
FROM publication_indexing
WHERE submitted_at IS NOT NULL
  AND first_indexed_at IS NOT NULL
ORDER BY hours_to_index ASC;

-- Plays por cancion en diferentes ventanas
SELECT song_id,
       SUM(plays_total) FILTER (WHERE day BETWEEN $1 AND $2) AS plays_range,
       SUM(plays_total) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days') AS plays_7d,
       SUM(plays_total) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days') AS plays_30d
FROM song_consumption_daily
GROUP BY song_id;

-- Tiempo de escucha promedio y completacion
SELECT c.song_id,
       s.duration_sec,
       ROUND(AVG(c.avg_listen_sec), 2) AS avg_listen_sec,
       ROUND(AVG(c.completion_rate), 4) AS completion_rate
FROM song_consumption_daily c
JOIN songs s ON s.id = c.song_id
WHERE c.day BETWEEN $1 AND $2
GROUP BY c.song_id, s.duration_sec;

-- Fuentes de trafico top
SELECT source,
       SUM(plays) AS plays
FROM song_traffic_source_daily
WHERE day BETWEEN $1 AND $2
GROUP BY source
ORDER BY plays DESC;

-- Heatmap por hora
SELECT hour_of_day,
       SUM(plays) AS plays
FROM song_listen_heatmap_hourly
WHERE day BETWEEN $1 AND $2
GROUP BY hour_of_day
ORDER BY hour_of_day;
