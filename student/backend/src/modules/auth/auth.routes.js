import { Router } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { apiError } from '../../utils/apiResponse.js';
import { requireStudent, requireStudentForAuth } from '../../middleware/authorization.js';
import { authController as controller } from './auth.controller.js';

const csrf = doubleCsrf({
  getSecret: () => env.sessionSecret || 'development-only-secret-replace-before-use',
  cookieName: 'hiikky.student.csrf',
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production' },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});
export const studentCsrfProtection = csrf.doubleCsrfProtection;

const rateLimitHandler = (message) => (_req, res) => apiError(res, { status: 429, message });
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler('Too many registration attempts. Try again in 15 minutes.') });
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler('Too many password requests. Try again in 15 minutes.') });

const authRoutes = Router();
authRoutes.get('/csrf', (req, res, next) => {
  try { res.locals.csrfToken = csrf.generateToken(req, res); return controller.csrf(req, res, next); } catch (error) { return next(error); }
});
authRoutes.post('/login', studentCsrfProtection, (req, res, next) => {
  req.csrfToken = () => csrf.generateToken(req, res, true);
  return controller.login(req, res, next);
});
authRoutes.post('/logout', studentCsrfProtection, controller.logout);
authRoutes.post('/change-password', requireStudentForAuth, studentCsrfProtection, (req, res, next) => {
  req.csrfToken = () => csrf.generateToken(req, res, true);
  return controller.changePassword(req, res, next);
});
authRoutes.post('/set-password', studentCsrfProtection, passwordLimiter, controller.setPassword);
authRoutes.post('/reset-password', studentCsrfProtection, passwordLimiter, controller.setPassword);
authRoutes.post('/forgot-password', studentCsrfProtection, passwordLimiter, controller.forgotPassword);
authRoutes.get('/me', requireStudentForAuth, controller.me);
export default authRoutes;

export const registrationRoutes = Router();
registrationRoutes.get('/organizations', controller.organizations);
registrationRoutes.post('/', studentCsrfProtection, registrationLimiter, controller.register);

export const profileRoutes = Router();
profileRoutes.get('/profile', requireStudent, controller.profile);
profileRoutes.patch('/profile', requireStudent, studentCsrfProtection, controller.updateProfile);
