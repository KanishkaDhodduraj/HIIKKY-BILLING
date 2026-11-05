import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiResponse } from './utils/apiResponse.js';

export function createApp({ sessionStore } = {}) {
  const app = express(); app.disable('x-powered-by');
  app.use(cors({ origin: env.clientOrigin, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN', 'X-Admin-Bootstrap-Secret'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use(session({ name: 'hiikky.sid', secret: env.sessionSecret || 'development-only-secret-replace-before-use', resave: false, saveUninitialized: false, store: sessionStore || (env.mongoUri ? MongoStore.create({ mongoUrl: env.mongoUri, collectionName: 'sessions' }) : undefined), cookie: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 8 * 60 * 60 * 1000 } }));
  app.get('/health', (_req, res) => apiResponse(res, { data: { status: 'ok' } }));
  app.use('/api/admin', (awaitImportRoutes));
  app.use(notFound); app.use(errorHandler); return app;
}
function awaitImportRoutes(_req, _res, next) { next(); }
