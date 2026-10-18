// Department routes.
//
// The thinnest layer: it only maps a method and a path to a controller
// function, and decides which routes are protected. No logic belongs here —
// reading this file should be enough to see every endpoint this resource
// exposes and which ones need a token.

// Router is a mini Express app that groups related routes. Instead of hanging
// everything off the main app, each resource gets its own router.
import { Router } from 'express';

import * as departmentsController from '../controllers/departments.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// The paths are '/' and not '/departments' because the base path is set where
// this router is mounted, in src/server.js. Mounted at /api/departments, these
// answer GET and POST /api/departments — and changing that base URL touches
// one line there instead of every route here.
//
// The controller function is passed without parentheses. It is not being
// called now; Express is being handed the function to run when a matching
// request arrives — the same idea as a callback.

// Listing stays open: department names are internal queue labels, harmless
// to read.
router.get('/', departmentsController.list);

// Middleware runs left to right, and the order is not optional: requireAuth
// sets req.user from the token, then requireRole reads it. If either one does
// not call next(), the controller never runs.
//
// Creating a department is a supervisor action — it changes how the whole
// organisation is structured, not just one case.
router.post('/', requireAuth, requireRole('supervisor'), departmentsController.create);

export default router;