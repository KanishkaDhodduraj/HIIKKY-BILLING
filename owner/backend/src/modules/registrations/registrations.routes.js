import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ownerCsrfProtection } from '../auth/ownerAuth.routes.js';
import { registrationController as controller } from './registration.controller.js';

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many registration attempts', data: null, timestamp: new Date().toISOString(), fieldErrors: null }) });
const router = Router();
router.post('/', ownerCsrfProtection, limiter, controller.submit);
router.get('/plans', controller.plans);
router.get('/:id', controller.status);
export default router;
