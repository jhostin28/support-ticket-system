// Express application configuration.
//
// Separated from server.js so tests can import the app without starting a
// real server. Supertest drives this object directly; src/server.js is the
// only thing that opens a port.

import express from 'express';

import './db.js';

import departmentsRouter from './routes/departments.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import ticketsRouter from './routes/tickets.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/departments', departmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/auth', authRouter);

export default app;