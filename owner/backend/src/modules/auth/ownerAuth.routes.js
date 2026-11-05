import { Router } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { requireOwner } from '../../middleware/authorization.js';
import { ownerAuthController as controller } from './ownerAuth.controller.js';

const csrf = doubleCsrf({ getSecret: () => env.sessionSecret || 'development-only-secret-replace-before-use', cookieName: 'hiikky.owner.csrf', cookieOptions: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production' }, getTokenFromRequest: (req) => req.headers['x-csrf-token'] });
export const ownerCsrfProtection = csrf.doubleCsrfProtection;
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, handler: (_req, res) => res.status(429).json({ success: false, message: 'Too many login failures', data: null, timestamp: new Date().toISOString(), fieldErrors: null }) });

const router = Router();
router.get('/csrf', (req, res, next) => { req.csrfToken = () => csrf.generateToken(req, res); controller.csrf(req, res, next); });
router.post('/login', ownerCsrfProtection, limiter, (req, res, next) => { req.csrfToken = () => csrf.generateToken(req, res, true); controller.login(req, res, next); });
router.post('/logout', requireOwner, ownerCsrfProtection, controller.logout);
router.post('/set-password', ownerCsrfProtection, controller.setPassword);
router.post('/forgot-password', ownerCsrfProtection, controller.forgotPassword);
router.get('/me', requireOwner, controller.me);
export default router;

export const profileRoutes = Router();
profileRoutes.get('/profile', requireOwner, controller.profile);
profileRoutes.patch('/profile', requireOwner, ownerCsrfProtection, controller.updateProfile);
