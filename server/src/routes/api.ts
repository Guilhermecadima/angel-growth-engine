import { Router } from 'express';
import { nanoid } from 'nanoid';
import { readCampaigns, writeCampaigns } from '../lib/store.js';
import type { Campaign, Platform } from '../types.js';
import { youtubeIdeas, youtubeMetrics } from '../services/youtube.js';
import { spotifyIdeas, spotifyMetrics } from '../services/spotify.js';
import { replySuggestions } from '../services/suggestions.js';
import { analyseGrowth, runSyntheticSimulation } from '../services/growth.js';

export const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, mockMode: process.env.MOCK_MODE === 'true' }));
api.get('/campaigns', async (_req, res) => res.json(await readCampaigns()));

api.post('/campaigns', async (req, res) => {
  const { name, platform, resourceId, goal, url, notes } = req.body ?? {};
  if (!name || !['youtube','spotify'].includes(platform) || !resourceId || !goal) {
    return res.status(400).json({ error: 'name, platform, resourceId and goal are required' });
  }
  const campaign: Campaign = {
    id: nanoid(10), name, platform: platform as Platform, resourceId, goal, url, notes,
    createdAt: new Date().toISOString(), snapshots: []
  };
  const items = await readCampaigns();
  items.unshift(campaign);
  await writeCampaigns(items);
  res.status(201).json(campaign);
});

api.delete('/campaigns/:id', async (req, res) => {
  const items = await readCampaigns();
  const next = items.filter(x => x.id !== req.params.id);
  await writeCampaigns(next);
  res.status(next.length === items.length ? 404 : 204).end();
});

api.post('/campaigns/:id/snapshot', async (req, res) => {
  const items = await readCampaigns();
  const c = items.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'campaign not found' });
  const metrics = c.platform === 'youtube' ? await youtubeMetrics(c.resourceId) : await spotifyMetrics(c.resourceId);
  c.snapshots.push({ at: new Date().toISOString(), metrics });
  await writeCampaigns(items);
  res.json({ campaignId: c.id, snapshot: c.snapshots.at(-1) });
});

api.get('/youtube/:videoId', async (req, res, next) => {
  try {
    const metrics = await youtubeMetrics(req.params.videoId);
    res.json({ metrics, growth: youtubeIdeas(metrics) });
  } catch (e) { next(e); }
});

api.get('/spotify/:trackId', async (req, res, next) => {
  try {
    const metrics = await spotifyMetrics(req.params.trackId);
    res.json({ metrics, growth: spotifyIdeas(metrics) });
  } catch (e) { next(e); }
});

api.post('/reply-suggestions', (req, res) => {
  const text = String(req.body?.text ?? '');
  res.json({ suggestions: replySuggestions(text) });
});

api.post('/growth/analyse', (req, res) => {
  const platform = String(req.body?.platform ?? '');
  if (!['youtube','spotify','instagram','tiktok'].includes(platform)) return res.status(400).json({ error: 'invalid platform' });
  res.json(analyseGrowth({ ...req.body, platform: platform as any }));
});

api.post('/simulation/run', (req, res) => {
  res.json(runSyntheticSimulation(req.body ?? {}));
});
