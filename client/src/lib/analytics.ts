import type { Period, SpotifyMetric, YouTubeMetric } from '../types';

export const compact = (value: number) => new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
export const number = (value: number) => new Intl.NumberFormat('pt-PT').format(Math.round(value || 0));
export const percent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`;

export function dateCutoff(period: Period, offset = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - period * (offset + 1) + 1);
  return date.toISOString().slice(0, 10);
}

export function inPeriod<T extends { metric_date: string }>(items: T[], period: Period, offset = 0) {
  const start = dateCutoff(period, offset);
  const end = offset === 0 ? '9999-12-31' : dateCutoff(period, offset - 1);
  return items.filter(item => item.metric_date >= start && item.metric_date < end);
}

export function sum<T, K extends keyof T>(items: T[], key: K) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

export function last<T extends { metric_date: string }, K extends keyof T>(items: T[], key: K) {
  const sorted = [...items].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  return Number(sorted.at(-1)?.[key] ?? 0);
}

export function change(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function spotifySummary(items: SpotifyMetric[], period: Period) {
  const channel = items.filter(item => item.scope_key === 'artist');
  const current = inPeriod(channel, period);
  const previous = inPeriod(channel, period, 1);
  const metrics = {
    streams: sum(current, 'streams'), listeners: sum(current, 'listeners'), saves: sum(current, 'saves'),
    playlistAdds: sum(current, 'playlist_adds'), followers: last(current, 'followers'), monthlyListeners: last(current, 'monthly_listeners'),
  };
  const prior = {
    streams: sum(previous, 'streams'), listeners: sum(previous, 'listeners'), saves: sum(previous, 'saves'),
    playlistAdds: sum(previous, 'playlist_adds'), followers: last(previous, 'followers'), monthlyListeners: last(previous, 'monthly_listeners'),
  };
  return { metrics, prior, changes: Object.fromEntries(Object.keys(metrics).map(key => [key, change(metrics[key as keyof typeof metrics], prior[key as keyof typeof prior])])) };
}

export function youtubeSummary(items: YouTubeMetric[], period: Period) {
  const channel = items.filter(item => item.scope_key === 'channel');
  const current = inPeriod(channel, period);
  const previous = inPeriod(channel, period, 1);
  const calculate = (rows: YouTubeMetric[]) => {
    const views = sum(rows, 'views');
    const likes = sum(rows, 'likes');
    const comments = sum(rows, 'comments');
    return {
      views, watchTime: sum(rows, 'watch_time_minutes'), subscribers: sum(rows, 'subscribers_gained') - sum(rows, 'subscribers_lost'),
      engagement: views ? ((likes + comments + sum(rows, 'shares')) / views) * 100 : 0,
      ctr: rows.length ? rows.reduce((a, row) => a + Number(row.impression_ctr ?? 0), 0) / rows.length : 0,
    };
  };
  const metrics = calculate(current);
  const prior = calculate(previous);
  return { metrics, prior, changes: Object.fromEntries(Object.keys(metrics).map(key => [key, change(metrics[key as keyof typeof metrics], prior[key as keyof typeof prior])])) };
}

export function dailySeries(spotify: SpotifyMetric[], youtube: YouTubeMetric[], period: Period) {
  const map = new Map<string, { date: string; spotify: number; youtube: number }>();
  inPeriod(spotify.filter(row => row.scope_key === 'artist'), period).forEach(row => map.set(row.metric_date, { date: row.metric_date, spotify: row.streams, youtube: 0 }));
  inPeriod(youtube.filter(row => row.scope_key === 'channel'), period).forEach(row => {
    const point = map.get(row.metric_date) ?? { date: row.metric_date, spotify: 0, youtube: 0 };
    point.youtube = row.views;
    map.set(row.metric_date, point);
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
