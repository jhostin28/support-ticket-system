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
  const departments = await departmentsService.getAll();

  // res.json() sends the value as JSON. With no status() call it defaults
  // to 200 OK, which is what a successful read should return.
  res.json(departments);
}

// POST /departments — create one department.
export async function create(req, res) {
  // req.body holds the JSON the client sent.
  // The braces are destructuring: pull the "name" property out of the object
  // and create a variable with that same name. The short form of
  // const name = req.body.name — which pays off with several fields at once:
  // const { name, email, password } = req.body
  const { name } = req.body;

  const department = await departmentsService.create(name);

  // 201 Created, not 200. The distinction matters: 200 means the request
  // succeeded, 201 means it succeeded AND something new now exists.
  // The created department is sent back so the client learns its id, which
  // the database generated through SERIAL.
  res.status(201).json(department);
}