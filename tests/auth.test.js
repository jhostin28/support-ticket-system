// Authentication tests.
//
// The first real tests: they hit the database, so they need a known state
// before each run. See tests/helpers.js.

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/db.js';
import { resetDatabase, seedTestData } from './helpers.js';

// beforeEach runs before every single test in this file, so each one starts
// from the same clean state. A test must never depend on what another test
// left behind, or they stop working when run in a different order.
beforeEach(async () => {
  await resetDatabase();
  await seedTestData();
});

// afterAll runs once at the end. Without closing the pool the process hangs
// and vitest never exits.
afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/login', () => {
  test('returns a token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@test.com', password: 'password123' });

    expect(response.status).toBe(200);
    // Not checking the token's exact value — it changes every run. Only that
    // one came back and is a string.
    expect(typeof response.body.token).toBe('string');
  });

  test('rejects a wrong password with 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@test.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });

  test('rejects an unknown email with 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(response.status).toBe(401);
  });

  // This is the test that protects the user-enumeration decision. Someone
  // "improving" the error messages later would break it here rather than in
  // production.
  test('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@test.com', password: 'wrongpassword' });

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  test('rejects a request with no password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@test.com' });

    expect(response.status).toBe(400);
  });
});