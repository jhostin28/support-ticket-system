// Department routes.
//
// The thinnest layer: it only maps a method and a path to a controller
// function. No logic belongs here — reading this file should be enough to see
// every endpoint this resource exposes.

// Router is a mini Express app that groups related routes. Instead of hanging
// everything off the main app, each resource gets its own router.
import { Router } from 'express';

import * as departmentsController from '../controllers/departments.js';

const router = Router();

// The paths are '/' and not '/departments' because the base path is set where
// this router is mounted, in server.js. Mounted at /api/departments, this line
// answers GET /api/departments — and changing that base URL touches one line
// there instead of every route here.
//
// The controller function is passed without parentheses. It is not being
// called now; Express is being handed the function to run when a matching
// request arrives — the same idea as a callback.
router.get('/', departmentsController.list);
router.post('/', departmentsController.create);

export default router;