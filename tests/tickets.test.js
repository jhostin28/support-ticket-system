// Ticket lifecycle tests.
//
// The business rules live here: what a status change does to the timestamps,
// and that a closed ticket is final. These are the rules that came out of how
// support actually works, so they are the ones worth protecting.

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/db.js';
import { resetDatabase, seedTestData, login } from './helpers.js';

let agentToken;
let clientId;

beforeEach(async () => {
  await resetDatabase();
  const data = await seedTestData();
  clientId = data.client.id;
  agentToken = await login(request, app, 'agent@test.com');
});

afterAll(async () => {
  await pool.end();
});

// Creating a ticket is the starting point for most of these, so it gets its
// own helper rather than being repeated in every test.
async function createTicket() {
  const response = await request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${agentToken}`)
    .send({
      title: 'Test ticket',
      description: 'Something is broken',
      clientId,
    });

  return response.body;
}

describe('POST /api/tickets', () => {
  test('creates a ticket with sensible defaults', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Test ticket',
        description: 'Something is broken',
        clientId,
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(response.body.priority).toBe('medium');
    expect(response.body.resolved_at).toBeNull();
    expect(response.body.closed_at).toBeNull();
  });

  // The identity rules from phase 2: these come from the token, so sending
  // them in the body must have no effect.
  test('ignores author, assignee and department sent in the body', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Test ticket',
        description: 'Something is broken',
        clientId,
        author_id: 999,
        user_id: 999,
        department_id: 999,
      });

    expect(response.status).toBe(201);
    expect(response.body.author_id).not.toBe(999);
    expect(response.body.user_id).not.toBe(999);
    expect(response.body.department_id).not.toBe(999);
  });

  test('rejects a missing title', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ description: 'Something is broken', clientId });

    expect(response.status).toBe(400);
  });

  test('rejects a client that does not exist', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Test ticket',
        description: 'Something is broken',
        clientId: 9999,
      });

    expect(response.status).toBe(400);
  });

  test('rejects a priority outside the enum', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Test ticket',
        description: 'Something is broken',
        clientId,
        priority: 'urgent',
      });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id', () => {
  test('setting status to resolving fills resolved_at', async () => {
    const ticket = await createTicket();

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'resolving' });

    expect(response.status).toBe(200);
    expect(response.body.resolved_at).not.toBeNull();
    // Closing has not happened, so that one stays empty.
    expect(response.body.closed_at).toBeNull();
  });

  test('setting status to closed fills closed_at', async () => {
    const ticket = await createTicket();

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'closed' });

    expect(response.body.closed_at).not.toBeNull();
  });

  // The trigger from phase 2. If someone drops it, this fails.
  test('updating a ticket moves updated_at past created_at', async () => {
    const ticket = await createTicket();

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ priority: 'high' });

    expect(new Date(response.body.updated_at).getTime())
      .toBeGreaterThan(new Date(response.body.created_at).getTime());
  });

  test('only changes the fields that were sent', async () => {
    const ticket = await createTicket();

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ priority: 'high' });

    expect(response.body.priority).toBe('high');
    expect(response.body.title).toBe(ticket.title);
    expect(response.body.description).toBe(ticket.description);
  });

  test('a closed ticket cannot be modified', async () => {
    const ticket = await createTicket();

    await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'closed' });

    const response = await request(app)
      .patch(`/api/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ priority: 'low' });

    expect(response.status).toBe(409);
  });

  test('a ticket that does not exist returns 404', async () => {
    const response = await request(app)
      .patch('/api/tickets/9999')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ priority: 'high' });

    expect(response.status).toBe(404);
  });
});