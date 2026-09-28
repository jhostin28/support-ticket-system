import { Router } from 'express';

import * as authController from '../controllers/auth.js';

const router = Router();

// The path is '/login', not '/', because this router will be mounted at
// /api/auth and the full endpoint should read POST /api/auth/login.
// Later the same router holds /logout or /refresh, each with its own path.
router.post('/login', authController.login);

export default router;