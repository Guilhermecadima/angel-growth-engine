import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../src/app.js';

process.env.MOCK_MODE = 'true';
const dataFile = path.resolve('src/data/campaigns.json');

beforeEach(async () => { await fs.writeFile(dataFile, '[]', 'utf8'); });

describe('API', () => {
  it('health works', async () => {
    const r = await request(createApp()).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('creates and snapshots a YouTube monitor', async () => {
    const app = createApp();
    const created = await request(app).post('/api/campaigns').send({
      name: 'Angel video', platform: 'youtube', resourceId: 'abc123', goal: 'views'
    });
    expect(created.status).toBe(201);
    const snap = await request(app).post(`/api/campaigns/${created.body.id}/snapshot`);
    expect(snap.status).toBe(200);
    expect(snap.body.snapshot.metrics.views).toBeGreaterThan(0);
  });

  it('rejects invalid monitor payload', async () => {
    const r = await request(createApp()).post('/api/campaigns').send({ platform: 'youtube' });
    expect(r.status).toBe(400);
  });

  it('generates reply suggestions', async () => {
    const r = await request(createApp()).post('/api/reply-suggestions').send({ text: 'Quando sai o próximo?' });
    expect(r.status).toBe(200);
    expect(r.body.suggestions.length).toBe(3);
  });

  it('builds a real-growth plan', async () => {
    const r = await request(createApp()).post('/api/growth/analyse').send({
      platform: 'instagram',
      title: 'Transformação de corte',
      goal: 'marcações',
      audience: 'clientes de barbearia'
    });
    expect(r.status).toBe(200);
    expect(r.body.score).toBeGreaterThanOrEqual(0);
    expect(r.body.recommendations.length).toBeGreaterThan(2);
    expect(r.body.hooks.length).toBe(3);
  });

  it('rejects unsupported growth platform', async () => {
    const r = await request(createApp()).post('/api/growth/analyse').send({ platform: 'unknown' });
    expect(r.status).toBe(400);
  });

  it('runs an isolated synthetic simulation', async () => {
    const r = await request(createApp()).post('/api/simulation/run').send({
      platform: 'youtube', targetViews: 10000, durationMinutes: 90,
      likeRate: 3.4, commentRate: 0.4, followRate: 0.2
    });
    expect(r.status).toBe(200);
    expect(r.body.synthetic).toBe(true);
    expect(r.body.requested).toBe(10000);
    expect(r.body.validated).toBeLessThanOrEqual(10000);
    expect(r.body.timeline.length).toBeGreaterThan(5);
    expect(r.body.warning).toContain('SIMULAÇÃO LOCAL');
  });

  it('clamps extreme simulator input', async () => {
    const r = await request(createApp()).post('/api/simulation/run').send({
      targetViews: 999999999, durationMinutes: -5, likeRate: 500
    });
    expect(r.status).toBe(200);
    expect(r.body.requested).toBe(1000000);
    expect(r.body.durationMinutes).toBe(1);
  });
});
