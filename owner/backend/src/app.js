import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiResponse } from './utils/apiResponse.js';

export function createApp({ sessionStore } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.clientOrigin, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN'] }));
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
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
