// Shared setup for tests.
//
// Every test needs the same starting point: a clean database with known data.
// Without this, the second test to create a user would fail on a duplicate
// email, and tests would depend on the order they ran in.

import pool from '../src/db.js';
import * as departmentsService from '../src/services/departments.js';
import * as usersService from '../src/services/users.js';
import * as clientsService from '../src/services/clients.js';

// Empty every table.
//
// TRUNCATE rather than DELETE: it is faster and RESTART IDENTITY resets the
// SERIAL counters, so ids start at 1 again on every run. Tests can then
// assume the first department is id 1.
//
// CASCADE is required because of the foreign keys — truncating departments
// while tickets point at it would be refused otherwise.
export async function resetDatabase() {
  await pool.query(`
    TRUNCATE comments, ticket_escalations, tickets, clients, users, departments
    RESTART IDENTITY CASCADE
  `);
}

// Create the minimum data a test needs, and return it so tests can use the
// ids and tokens without repeating the setup.
export async function seedTestData() {
  const tier1 = await departmentsService.create('Tier 1');
  const billing = await departmentsService.create('Billing');

  const supervisor = await usersService.create({
    name: 'Super Visor',
    email: 'supervisor@test.com',
    password: 'password123',
    role: 'supervisor',
    departmentId: tier1.id,
  });

  const agent = await usersService.create({
    name: 'Agent Smith',
    email: 'agent@test.com',
    password: 'password123',
    role: 'agent',
    departmentId: tier1.id,
  });

  const client = await clientsService.create({
    name: 'Test Client',
    phone: '809-555-0000',
    email: 'client@test.com',
  });

  return { tier1, billing, supervisor, agent, client };
}

// Log in and return the token, so tests do not repeat the login call.
export async function login(request, app, email) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });

  return response.body.token;
}