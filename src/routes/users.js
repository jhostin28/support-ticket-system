// User routes.
//
// Same structure as src/routes/departments.js — compare the two: the only
// differences are the names and that departments has two routes (GET and POST)
// while this one has only POST, since listing users is not needed yet.

// Router is a mini Express app that groups related routes. Each resource gets
// its own router instead of hanging everything off the main app.
import { Router } from 'express';

import * as usersController from '../controllers/users.js';

const router = Router();

// The path is '/' and not '/users' because the base path is set where this
// router is mounted, in src/server.js — exactly as departments does it.
// Mounted at /api/users, this line answers POST /api/users.
//
// The controller function is passed without parentheses: Express is being
// handed the function to run when a matching request arrives, not called now.
router.post('/', usersController.create);

export default router;