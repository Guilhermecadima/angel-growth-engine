import type { SpotifyMetric } from '../types';

const aliases: Record<string, string[]> = {
  date: ['date', 'data', 'metric_date', 'day'],
  streams: ['streams', 'stream', 'reproducoes', 'reproduções'],
  listeners: ['listeners', 'ouvintes', 'unique_listeners'],
  saves: ['saves', 'guardados', 'salvamentos'],
  playlist_adds: ['playlist_adds', 'playlist adds', 'adicoes_playlist', 'adições em playlists'],
  followers: ['followers', 'seguidores'],
  monthly_listeners: ['monthly_listeners', 'monthly listeners', 'ouvintes_mensais', 'ouvintes mensais'],
  track: ['track', 'track_name', 'song', 'faixa', 'titulo', 'título'],
};

function splitLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(value.trim()); value = ''; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

const normal = (value: string) => value.trim().toLowerCase().replace(/\uFEFF/g, '').replace(/[-_]+/g, ' ');
const valueFor = (row: Record<string, string>, key: keyof typeof aliases) => {
  const match = aliases[key].map(normal).find(alias => Object.prototype.hasOwnProperty.call(row, alias));
  return match ? row[match] : '';
};
const numeric = (value: string) => Number(String(value || '0').replace(/\s/g, '').replace(',', '.')) || 0;

export type SpotifyCsvRow = Omit<SpotifyMetric, 'artist_id'> & { track_name?: string };

export function parseSpotifyCsv(text: string): SpotifyCsvRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('O CSV não tem linhas de dados.');
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = splitLine(lines[0], delimiter).map(normal);
  const rows = lines.slice(1).map(line => {
    const cells = splitLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
  const parsed = rows.map((row, index) => {
    const dateValue = valueFor(row, 'date');
    const date = new Date(dateValue);
    if (!dateValue || Number.isNaN(date.valueOf())) throw new Error(`Data inválida na linha ${index + 2}.`);
    const streams = numeric(valueFor(row, 'streams'));
    const listeners = numeric(valueFor(row, 'listeners'));
    if (!streams && !listeners) throw new Error(`A linha ${index + 2} precisa de streams ou listeners.`);
    const trackName = valueFor(row, 'track') || undefined;
    return {
      metric_date: date.toISOString().slice(0, 10), scope_key: trackName ? `track:${normal(trackName)}` : 'artist',
      listeners, streams, streams_per_listener: listeners ? Number((streams / listeners).toFixed(2)) : null,
      saves: numeric(valueFor(row, 'saves')), playlist_adds: numeric(valueFor(row, 'playlist_adds')),
      followers: valueFor(row, 'followers') ? numeric(valueFor(row, 'followers')) : null,
      monthly_listeners: valueFor(row, 'monthly_listeners') ? numeric(valueFor(row, 'monthly_listeners')) : null,
      track_name: trackName, metadata: { source: 'spotify-for-artists-csv' },
    };
  });
  return parsed.sort((a, b) => a.metric_date.localeCompare(b.metric_date));
}
