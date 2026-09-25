// Entry point of the application.
// Starts an Express server and keeps it listening for HTTP requests.

// Import the Express framework.
// Node can serve HTTP on its own, but Express handles the repetitive parts:
// reading the URL and method, parsing the body, building the response.
import express from 'express';
import './db.js';

// express is a function. Calling it returns an application object,
// which is what routes and middleware get attached to.
const app = express();

// The port this server listens on. 3000 is the usual choice in development.
// Later this will come from an environment variable, so it can differ
// between local machine and production.
const PORT = 3000;

// Health check endpoint.
// Returns a fixed response so monitoring tools can confirm the API is up.
// It touches nothing else, so a 200 here means the process is running.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server.
// listen() takes the port and a callback — a function that does not run now,
// but once the server is actually up and listening.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});