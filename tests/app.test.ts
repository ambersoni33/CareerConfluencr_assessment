import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Core & Health Endpoints', () => {
  const app = createApp();

  it('GET /health should return status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('Transaction Ledger API');
  });

  it('GET / should return welcome message and documentation links', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Welcome to the Transaction Ledger API');
    expect(res.body.documentation).toBe('/docs');
  });

  it('GET /openapi.json should return the OpenAPI specification', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Transaction Ledger API');
  });

  it('GET unknown route should return 404 with standard error format', async () => {
    const res = await request(app).get('/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
