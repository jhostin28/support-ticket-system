// Entry point of the application.
// Starts an Express server and keeps it listening for HTTP requests.

// Import the Express framework.
// Node can serve HTTP on its own, but Express handles the repetitive parts:
// reading the URL and method, parsing the body, building the response.
import express from 'express';

// No name and no "from": this module is imported only so it runs, opening the
// connection pool and reporting at startup whether the database is reachable.
import './db.js';

import departmentsRouter from './routes/departments.js';

// express is a function. Calling it returns an application object,
// which is what routes and middleware get attached to.
const app = express();

// The port comes from the environment, falling back to 3000 locally.
// || means "or": use process.env.PORT if it exists, otherwise 3000.
// In production the host usually assigns the port itself.
const PORT = process.env.PORT || 3000;

// --- Middleware -------------------------------------------------------------
// Middleware runs between the request arriving and the controller handling it.
// Each one can read the request, change it, or stop it there.
//
// express.json() checks whether the request carries a JSON body and, if so,
// parses it into req.body. Without this line req.body would be undefined and
// every POST would fail — a classic bug.
//
// It has to come before the routes, since the body must be parsed before a
// controller can read it.
app.use(express.json());

// --- Routes -----------------------------------------------------------------

// Health check endpoint.
// Returns a fixed response so monitoring tools can confirm the API is up.
// It touches nothing else, so a 200 here means the process is running.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mounting the router under a base path: the router declares '/' and this line
// decides it answers at /api/departments. Changing the base URL — adding a
// version, say — is a one-line change here rather than an edit in every route.
//
// The /api prefix keeps API endpoints separate from anything else this server
// might serve later, such as HTML pages.
app.use('/api/departments', departmentsRouter);

// Start the server.
// listen() takes the port and a callback — a function that does not run now,
// but once the server is actually up and listening.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});