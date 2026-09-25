// Database connection.
//
// Creates a single connection pool for the whole application and exports it,
// so every part of the API talks to PostgreSQL through the same pool.

// Loads the .env file into process.env.
// No name and no "from": this module is imported only so it runs.
// Without this line, process.env.DB_PASSWORD would be undefined and the
// connection would fail.
import 'dotenv/config';

// pg exports several things (Pool, Client, and more), so the braces pick out
// just the one needed here.
import { Pool } from 'pg';

// A pool keeps a set of open connections to PostgreSQL and lends them out.
// Opening a connection is slow — there is a network handshake and
// authentication — so doing it per request would waste time. A query borrows
// a free connection, uses it, and returns it to the pool.
//
// Every value comes from the environment, never hardcoded: the repo is public,
// and in production these variables are set by the server, with no .env file
// involved. Same code, different credentials per environment.
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Each file is a closed box: what is declared inside does not leave unless it
// is exported. This makes the pool the main thing this file offers, so other
// files can do: import pool from './db.js'
export default pool;

// Verify the connection on startup.
// SELECT NOW() just asks PostgreSQL for its current time — the result does not
// matter, only that the query succeeded.
//
// Talking to a database takes time, so query() does not return the result
// straight away: it returns a promise, a value that will be settled later.
// .then() is what to do if it works, .catch() if it fails.
//
// A failure here means wrong credentials or a database that is not running,
// and it is better to find that out at startup than on the first request.
pool.query('SELECT NOW()')
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Database connection failed:', err.message));