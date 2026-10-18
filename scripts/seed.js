// Seeds a fresh database with the minimum to start: departments and one
// supervisor.
//
// Run once, from the terminal: npm run seed
//
// This exists because creating users requires a supervisor, which leaves a
// chicken-and-egg problem on a new install. A script solves it without
// leaving an open endpoint in the API.
//
// It calls the services rather than writing SQL, so the password goes through
// the same hashing path as every other user — the reason hashing lives in the
// service and not the controller.

import pool from '../src/db.js';
import * as departmentsService from '../src/services/departments.js';
import * as usersService from '../src/services/users.js';

async function seed() {
  const existing = await departmentsService.getAll();

  if (existing.length > 0) {
    console.log('Database already has data. Nothing to seed.');
    await pool.end();
    return;
  }

  const tier1 = await departmentsService.create('Tier 1');
  await departmentsService.create('Billing');
  await departmentsService.create('Technical Support');

  await usersService.create({
    name: 'Admin',
    email: 'admin@company.com',
    password: 'changeme',
    role: 'supervisor',
    departmentId: tier1.id,
  });

  console.log('Seeded: 3 departments and one supervisor.');
  console.log('Login with admin@company.com / changeme — then change it.');

  // Without this the pool keeps the process alive and the script never exits.
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});