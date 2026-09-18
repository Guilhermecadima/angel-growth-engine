export type Platform = 'youtube' | 'spotify';

export type Campaign = {
  id: string;
  name: string;
  platform: Platform;
  resourceId: string;
  url?: string;
  goal: 'views' | 'comments' | 'followers' | 'saves' | 'clicks';
  notes?: string;
  createdAt: string;
  snapshots: Snapshot[];
};

export type Snapshot = {
  at: string;
  metrics: Record<string, number | string | boolean>;
};
