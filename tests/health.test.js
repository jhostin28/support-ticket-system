// First integration test.
//
// Integration, not unit: it goes through the real stack — Express, the
// routes, the middleware — rather than calling one function in isolation.
// A single test like this covers more ground than several unit tests.

import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// describe groups related tests. Purely for readability in the output.
describe('GET /health', () => {
  // test() declares one case. The string is what prints when it passes or
  // fails, so it reads as a sentence: "GET /health returns 200".
  test('returns 200 and a status of ok', async () => {
    // supertest drives the app object straight, with no port involved.
    const response = await request(app).get('/health');

    // expect() is the assertion: what should be true. If it is not, the test
    // fails and the runner says what it got instead.
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});