import { z } from 'zod';
import bcrypt from 'bcrypt';
import AdminAccount from '../../models/AdminAccount.js';
import { env } from '../../config/env.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { authService, safeAccount } from './auth.service.js';
const loginSchema = z.object({ email: z.string().email().max(255), password: z.string().min(6).max(100) });
const bootstrapSchema = z.object({ email: z.string().email().max(255), password: z.string().min(12).max(72) });
export const authController = {
  csrf(req, res) { return apiResponse(res, { data: { token: req.csrfToken(), headerName: 'X-CSRF-TOKEN', parameterName: '_csrf' } }); },
  async login(req, res, next) { try { const { email, password } = loginSchema.parse(req.body); const account = await authService.login(email, password); if (!account) { const e = new Error('Invalid email or password'); e.status = 401; throw e; } await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve())); req.session.admin = safeAccount(account); return apiResponse(res, { message: 'Login successful', data: req.session.admin }); } catch (e) { next(e); } },
  async logout(req, res, next) { try { await new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve())); res.clearCookie('hiikky.sid'); res.clearCookie('hiikky.csrf'); return apiResponse(res, { message: 'Logged out' }); } catch (e) { next(e); } },
  me(req, res) { return apiResponse(res, { data: req.session.admin.email }); },
  profile(req, res) { return apiResponse(res, { data: req.session.admin }); },
  async updateProfile(req, res, next) { try { const schema = z.object({ currentPassword: z.string().min(1), email: z.string().email().max(255).optional(), newPassword: z.string().min(8).max(72).optional() }).refine((v) => v.email || v.newPassword, 'Email or newPassword is required'); const input = schema.parse(req.body); const account = await AdminAccount.findById(req.session.admin.id).select('+passwordHash'); if (!await bcrypt.compare(input.currentPassword, account.passwordHash)) { const e = new Error('Current password is incorrect'); e.status = 401; throw e; } if (input.email) account.email = input.email.toLowerCase(); if (input.newPassword) account.passwordHash = await bcrypt.hash(input.newPassword, 12); await account.save(); req.session.admin = safeAccount(account); return apiResponse(res, { data: req.session.admin }); } catch (e) { next(e); } },
  async bootstrap(req, res, next) { try { const input = bootstrapSchema.parse(req.body); const account = await authService.bootstrap(input.email, input.password, req.get('X-Admin-Bootstrap-Secret'), env.bootstrapSecret); return apiResponse(res, { status: 201, message: 'Super Admin created', data: safeAccount(account) }); } catch (e) { next(e); } },
};
