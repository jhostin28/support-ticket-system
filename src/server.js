// Entry point of the application.
// Starts an Express server and keeps it listening for HTTP requests.

// Import the Express framework.
// Node can serve HTTP on its own, but Express handles the repetitive parts:
// reading the URL and method, parsing the body, building the response.
import express from 'express';

// No name and no "from": this module is imported only so it runs, opening the
// connection pool and reporting at startup whether the database is reachable.
// See src/db.js.
import './db.js';

// One router per resource. Each of these files (src/routes/*.js) only maps
// methods and paths to controller functions.
import departmentsRouter from './routes/departments.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';

// express is a function. Calling it returns an application object,
// which is what routes and middleware get attached to.
const app = express();

// The port comes from the environment, falling back to 3000 locally.
// || means "or": use process.env.PORT if it exists, otherwise 3000.
// The variable itself lives in .env and is loaded by dotenv inside src/db.js,
// which is why it works here without importing dotenv again.
const PORT = process.env.PORT || 3000;

// --- Middleware -------------------------------------------------------------
// Middleware runs between the request arriving and the controller handling it.
// Each one can read the request, change it, or stop it there.
//
// express.json() checks whether the request carries a JSON body and, if so,
// parses it into req.body. Without this line req.body would be undefined and
// every POST would fail — a classic bug. It is what makes the destructuring
// in the controllers work, for example in src/controllers/users.js.
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

// Mounting a router under a base path: the full endpoint is base + the path
// declared inside the router. src/routes/departments.js has router.get('/'),
// so mounted here it answers GET /api/departments.
//
// Changing the base URL — adding a version, say — is a one-line change here
// rather than an edit in every route file.
//
// The /api prefix keeps API endpoints separate from anything else this server
// might serve later, such as HTML pages.
app.use('/api/departments', departmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients' , clientsRouter);

// auth is not a resource like the two above, it is a group of actions, so the
// router names each path itself: src/routes/auth.js declares '/login', which
// mounted here answers POST /api/auth/login. Putting /login in this base path
// as well would produce /api/auth/login/login.
app.use('/api/auth', authRouter);

// Start the server.
// listen() takes the port and a callback — a function that does not run now,
// but once the server is actually up and listening.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});