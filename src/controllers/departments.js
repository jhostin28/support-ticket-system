// Department controller.
//
// The translator between HTTP and the service layer. It pulls values out of
// the request, calls the service, and decides what the response looks like —
// status code and body.
//
// No SQL lives here. The service, in turn, knows nothing about req or res.
// That split is what lets the same service be reused by a script or a
// scheduled job, where there is no HTTP request at all.

// The asterisk imports everything the module exports under one name, so each
// call reads as departmentsService.getAll() and it stays obvious where the
// function comes from.
import * as departmentsService from '../services/departments.js';


// GET /departments — list every department.
export async function list(req, res) {
  try {
    const departments = await departmentsService.getAll();

    // res.json() sends the value as JSON. With no status() call it defaults
    // to 200 OK, which is what a successful read should return.
    res.json(departments);
  } catch (err) {
    // Nothing is expected to fail here, so anything that does is a real
    // server-side problem — the database being down, for instance.
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}

// POST /departments — create one department.
export async function create(req, res) {
  // req.body holds the JSON the client sent.
  // The braces are destructuring: pull the "name" property out of the object
  // and create a variable with that same name. The short form of
  // const name = req.body.name — which pays off with several fields at once:
  // const { name, email, password } = req.body

  // || {} guards against a request with no body at all. Without it,
  // destructuring undefined throws before the validation below ever runs, and
  // the client gets a 500 instead of a clear 400.
  const { name } = req.body || {};

  // Validate before touching the database. The NOT NULL constraint would
  // catch a missing name anyway, but by then the error is a database error:
  // wrong status code and an unhelpful message. Checking here returns a clear
  // 400 and never opens a connection.
  //
  // return matters — without it the function would carry on to the service
  // even after answering, and Express would complain about sending two
  // responses for one request.
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  // try wraps the part that can fail. If anything inside throws, execution
  // jumps straight to catch.
  try {
    const department = await departmentsService.create(name);

    // 201 Created, not 200. The distinction matters: 200 means the request
    // succeeded, 201 means it succeeded AND something new now exists.
    // The created department is sent back so the client learns its id, which
    // the database generated through SERIAL.
    res.status(201).json(department);
  } catch (err) {
    // PostgreSQL tags every error with a code, and pg passes it through.
    // 23505 is a unique violation — the same "SQL state: 23505" pgAdmin shows.
    // Others worth knowing: 23503 (foreign key) and 23502 (not null).
    //
    // A duplicate name is an expected outcome: this code created that UNIQUE
    // rule. 409 Conflict is the right answer — the request is well formed but
    // clashes with what already exists. A 500 would wrongly blame the server.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'a department with that name already exists' });
    }

    // Anything else is unexpected. The detail goes to the server log, where
    // it is useful; the client gets a generic message.
    //
    // This is what the default Express error page got wrong: it returned HTML
    // instead of JSON and leaked absolute file paths and line numbers —
    // a map of the system handed to whoever is probing it.
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}