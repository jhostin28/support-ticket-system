// Permission tests.
//
// These are the ones that matter most: they cover the bug found by hand in
// phase 4, where a duplicated route left an endpoint unprotected. A test like
// the first one below would have caught it immediately.

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/db.js';
import { resetDatabase, seedTestData, login } from './helpers.js';

// Declared outside so every test can use them. beforeEach fills them in.
let agentToken;
let supervisorToken;

beforeEach(async () => {
  await resetDatabase();
  await seedTestData();

  // Each test needs to act as someone, so both tokens are ready up front.
  agentToken = await login(request, app, 'agent@test.com');
  supervisorToken = await login(request, app, 'supervisor@test.com');
});

afterAll(async () => {
  await pool.end();
});

describe('role permissions', () => {
  test('an agent cannot create a department', async () => {
    const response = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ name: 'Retention' });

    expect(response.status).toBe(403);
  });

  test('a supervisor can create a department', async () => {
    const response = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ name: 'Retention' });

    expect(response.status).toBe(201);
  });

  test('an agent cannot create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Sneaky',
        email: 'sneaky@test.com',
        password: 'password123',
        role: 'supervisor',
        departmentId: 1,
      });

    expect(response.status).toBe(403);
  });

  test('a request with no token is rejected', async () => {
    const response = await request(app)
      .post('/api/departments')
      .send({ name: 'Retention' });

    // 401, not 403: nobody is identified at all.
    expect(response.status).toBe(401);
  });
});