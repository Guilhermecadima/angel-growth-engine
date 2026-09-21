export type Platform = 'youtube' | 'spotify';
export type Page = 'overview' | 'spotify' | 'youtube' | 'recommendations' | 'ideas' | 'manager' | 'data';
export type Period = 7 | 28 | 90;

export type Artist = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  spotify_artist_id: string | null;
  youtube_channel_id: string | null;
  created_by: string | null;
};

export type PlatformAccount = {
  id: string;
  artist_id: string;
  platform: Platform;
  display_name: string | null;
  handle: string | null;
  is_connected: boolean;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
};

export type SpotifyMetric = {
  id?: string;
  artist_id: string;
  platform_account_id?: string | null;
  track_id?: string | null;
  metric_date: string;
  scope_key: string;
  listeners: number;
  streams: number;
  streams_per_listener: number | null;
  saves: number;
  playlist_adds: number;
  followers: number | null;
  monthly_listeners: number | null;
  metadata?: Record<string, unknown>;
};

export type YouTubeMetric = {
  id?: string;
  artist_id: string;
  platform_account_id?: string | null;
  video_id?: string | null;
  metric_date: string;
  scope_key: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribers_gained: number;
  subscribers_lost: number;
  watch_time_minutes: number;
  average_view_duration_seconds: number;
  impressions: number;
  impression_ctr: number | null;
  unique_viewers: number | null;
  metadata?: Record<string, unknown>;
};

export type Track = {
  id: string;
  artist_id: string;
  spotify_track_id: string | null;
  title: string;
  album_name: string | null;
  release_date: string | null;
  cover_url: string | null;
  spotify_url: string | null;
  metadata?: Record<string, unknown>;
};

export type Video = {
  id: string;
  artist_id: string;
  youtube_video_id: string;
  title: string;
  published_at: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  metadata?: Record<string, unknown>;
};

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'new' | 'accepted' | 'dismissed' | 'completed';

export type Recommendation = {
  id: string;
  artist_id: string;
  platform: Platform | 'cross-platform' | null;
  source: 'rules' | 'ai';
  category: string | null;
  priority: Priority;
  title: string;
  explanation: string | null;
  recommended_action: string;
  evidence: Record<string, unknown>;
  confidence: number | null;
  status: RecommendationStatus;
  created_at: string;
  updated_at?: string;
};

export type ContentIdea = {
  id: string;
  artist_id: string;
  platform: 'youtube' | 'youtube_short' | 'spotify' | 'cross-platform';
  title: string;
  content_type: string | null;
  hook: string | null;
  concept: string | null;
  caption: string | null;
  call_to_action: string | null;
  hashtags: string[] | null;
  reasoning: string | null;
  status: 'idea' | 'planned' | 'created' | 'published' | 'discarded';
  scheduled_for: string | null;
  created_by_ai: boolean;
  created_at: string;
};

export type ActivityRun = {
  id: string;
  source?: Platform;
  file_name?: string;
  status: string;
  rows_processed: number;
  started_at?: string;
  created_at?: string;
  completed_at: string | null;
  error_message: string | null;
};

export type ManagerMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

export type WorkspaceData = {
  accounts: PlatformAccount[];
  spotifyMetrics: SpotifyMetric[];
  youtubeMetrics: YouTubeMetric[];
  tracks: Track[];
  videos: Video[];
  recommendations: Recommendation[];
  ideas: ContentIdea[];
  syncRuns: ActivityRun[];
  imports: ActivityRun[];
  isDemo: boolean;
};

export type RuleInsight = Omit<Recommendation, 'id' | 'artist_id' | 'created_at' | 'updated_at' | 'status'>;
