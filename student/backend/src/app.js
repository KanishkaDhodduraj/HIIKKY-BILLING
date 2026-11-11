import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiResponse } from './utils/apiResponse.js';
import authRoutes, { profileRoutes, registrationRoutes } from './modules/auth/auth.routes.js';
import studentRoutes from './modules/student/student.routes.js';

export function createApp({ sessionStore } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin: env.clientOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN', 'Idempotency-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size'],
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(session({
    name: 'hiikky.student.sid',
    secret: env.sessionSecret || 'development-only-secret-replace-before-use',
    resave: false,
    saveUninitialized: false,
    store: sessionStore || (env.mongoUri ? MongoStore.create({ mongoUrl: env.mongoUri, collectionName: 'student_sessions' }) : undefined),
    cookie: { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.get('/health', (_req, res) => apiResponse(res, { data: { status: 'ok', app: 'student' } }));
  app.use('/api/student/auth', authRoutes);
  app.use('/api/student/registration', registrationRoutes);
  app.use('/api/student', profileRoutes);
  app.use('/api/student', studentRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
