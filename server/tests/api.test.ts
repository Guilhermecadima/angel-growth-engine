import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createOAuthState, readOAuthState } from '../src/services/youtubeOAuth.js';

process.env.MOCK_MODE = 'true';
process.env.OAUTH_STATE_SECRET = 'test-secret-with-enough-entropy';

describe('production API', () => {
  it('reports adapter readiness without leaking secrets', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, mockMode: true });
    expect(JSON.stringify(response.body)).not.toContain('test-secret');
  });

  it('protects user-scoped endpoints', async () => {
    const sync = await request(createApp()).post('/api/youtube/sync/00000000-0000-0000-0000-000000000000');
    const ai = await request(createApp()).post('/api/ai/analyse').send({ question: 'O que faço?' });
    expect(sync.status).toBe(401);
    expect(ai.status).toBe(401);
  });

  it('returns a controlled 404', async () => {
    const response = await request(createApp()).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });

  it('signs and verifies short-lived OAuth state', () => {
    const state = createOAuthState('artist-1', 'user-1');
    expect(readOAuthState(state)).toMatchObject({ artistId: 'artist-1', userId: 'user-1' });
    expect(() => readOAuthState(`${state}tampered`)).toThrow('Invalid OAuth state');
  });
});
