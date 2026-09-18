const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export type Campaign = {
  id: string; name: string; platform: 'youtube'|'spotify'; resourceId: string;
  goal: string; createdAt: string; snapshots: {at:string; metrics:Record<string, any>}[];
};

export type GrowthResult = {
  score:number; platform:string; goal:string; audience:string; headline:string;
  recommendations:string[]; next24h:string[]; hooks:string[]; caption:string; metricsToWatch:string[];
};

export type SimulationResult = {
  synthetic:boolean; warning:string; platform:string; requested:number; durationMinutes:number;
  rejected:number; validated:number; likes:number; comments:number; follows:number;
  avgRetention:number; rejectionRate:number;
  timeline:{minute:number;gross:number;validated:number}[];
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, { ...init, headers: { 'Content-Type':'application/json', ...(init?.headers ?? {}) }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error ?? `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => json<{ok:boolean;mockMode:boolean}>('/health'),
  campaigns: () => json<Campaign[]>('/campaigns'),
  createCampaign: (body:any) => json<Campaign>('/campaigns',{method:'POST',body:JSON.stringify(body)}),
  snapshot: (id:string) => json<any>(`/campaigns/${id}/snapshot`,{method:'POST'}),
  remove: (id:string) => json<void>(`/campaigns/${id}`,{method:'DELETE'}),
  youtube: (id:string) => json<any>(`/youtube/${encodeURIComponent(id)}`),
  spotify: (id:string) => json<any>(`/spotify/${encodeURIComponent(id)}`),
  replies: (text:string) => json<{suggestions:string[]}>('/reply-suggestions',{method:'POST',body:JSON.stringify({text})}),
  analyseGrowth: (body:any) => json<GrowthResult>('/growth/analyse',{method:'POST',body:JSON.stringify(body)}),
  simulate: (body:any) => json<SimulationResult>('/simulation/run',{method:'POST',body:JSON.stringify(body)})
};
