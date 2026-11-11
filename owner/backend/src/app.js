import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiResponse } from './utils/apiResponse.js';
import authRoutes, { ownerCsrfProtection, profileRoutes } from './modules/auth/ownerAuth.routes.js';
import { requireOwner } from './middleware/authorization.js';
import subscribersRoutes from './modules/subscribers/subscribers.routes.js';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes.js';
import coursesRoutes from './modules/courses/courses.routes.js';
import courseInstallmentRoutes from './modules/courses/installments.routes.js';
import discountsRoutes from './modules/discounts/discounts.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import registrationsRoutes from './modules/registrations/registrations.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import studentsRoutes from './modules/students/students.routes.js';

export function createApp({ sessionStore } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.clientOrigin, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN'], exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(session({
    name: 'hiikky.owner.sid',
    secret: env.sessionSecret || 'development-only-secret-replace-before-use',
    resave: false,
    saveUninitialized: false,
    store: sessionStore || (env.mongoUri ? MongoStore.create({ mongoUrl: env.mongoUri, collectionName: 'owner_sessions' }) : undefined),
    cookie: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.get('/health', (_req, res) => apiResponse(res, { data: { status: 'ok', app: 'owner' } }));
  app.use('/api/owner/auth', authRoutes);
  app.use('/api/owner/registrations', registrationsRoutes);
  app.use('/api/owner', profileRoutes);
  app.use('/api/owner/dashboard', ...[requireOwner], dashboardRoutes);
  app.use('/api/owner/analytics', ...[requireOwner], dashboardRoutes);
  const protectOwnerApi = [requireOwner, ownerCsrfProtection];
  app.use('/api/owner/subscribers', ...protectOwnerApi, subscribersRoutes);
  app.use('/api/owner/subscriptions', ...protectOwnerApi, subscriptionsRoutes);
  app.use('/api/owner/courses', ...protectOwnerApi, courseInstallmentRoutes);
  app.use('/api/owner/courses', ...protectOwnerApi, coursesRoutes);
  app.use('/api/owner/discounts', ...protectOwnerApi, discountsRoutes);
  app.use('/api/owner/notifications', ...protectOwnerApi, notificationsRoutes);
  app.use('/api/owner/settings', ...protectOwnerApi, settingsRoutes);
  app.use('/api/owner/students', studentsRoutes);
  app.use('/api/owner/billing', ...protectOwnerApi, billingRoutes);
  app.use('/api/owner/invoices', ...protectOwnerApi, billingRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
