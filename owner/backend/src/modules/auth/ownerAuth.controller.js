import { z } from 'zod';
import bcrypt from 'bcrypt';
import { apiResponse } from '../../utils/apiResponse.js';
import BusinessOwner from '../../models/BusinessOwner.js';
import { env } from '../../config/env.js';
import { ownerAuthService } from './ownerAuth.service.js';
import { mailService } from './mail.service.js';

const safeOwner = (owner) => ({ id: String(owner._id), firstName: owner.firstName, lastName: owner.lastName, fullName: [owner.firstName, owner.lastName].filter(Boolean).join(' '), email: owner.email, phone: owner.phone, status: owner.status });
const credentials = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(72) });
const newPassword = z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');

export const ownerAuthController = {
  csrf(req, res, _next) { const token = req.csrfToken(); return apiResponse(res, { data: { token, headerName: 'X-CSRF-TOKEN', parameterName: '_csrf' } }); },
  async login(req, res, next) {
    try {
      const { email, password } = credentials.parse(req.body);
      const result = await ownerAuthService.login(email, password);
      if (!result) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
      await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.cookie.maxAge = result.autoLogoutMinutes * 60 * 1000;
      if (result.twoFactorEnabled) {
        req.session.pendingOwner = { id: String(result.owner._id), organizationIds: result.organizations, organizationId: result.organizationId };
        const code = await ownerAuthService.issueLoginCode(result.organizationId);
        await mailService.sendLoginCode({ email: result.owner.email, code });
        return apiResponse(res, { message: 'Verification code sent', data: { requiresOtp: true, email: result.owner.email, csrfToken: req.csrfToken(true) } });
      }
      req.session.owner = { ...safeOwner(result.owner), organizationIds: result.organizations };
      return apiResponse(res, { message: 'Login successful', data: { ...safeOwner(result.owner), csrfToken: req.csrfToken(true) } });
    } catch (error) { next(error); }
  },
  async verifyOtp(req, res, next) {
    try {
      const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
      const pending = req.session.pendingOwner;
      if (!pending) throw Object.assign(new Error('Login verification has expired'), { status: 401 });
      await ownerAuthService.verifyLoginCode(pending.organizationId, code);
      const owner = await ownerAuthService.safeProfile(pending.id);
      req.session.owner = { ...safeOwner(owner), organizationIds: pending.organizationIds };
      delete req.session.pendingOwner;
      return apiResponse(res, { message: 'Login successful', data: { ...safeOwner(owner), csrfToken: req.csrfToken() } });
    } catch (error) { next(error); }
  },
  async logout(req, res, next) {
    try {
      await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
      res.clearCookie('hiikky.owner.sid'); res.clearCookie('hiikky.owner.csrf');
      return apiResponse(res, { message: 'Logged out' });
    } catch (error) { next(error); }
  },
  async setPassword(req, res, next) {
    try {
      const { token, password } = z.object({ token: z.string().min(32).max(128), password: newPassword }).parse(req.body);
      const owner = await ownerAuthService.setPassword(token, password);
      return apiResponse(res, { message: 'Password created', data: safeOwner(owner) });
    } catch (error) { next(error); }
  },
  async forgotPassword(req, res, next) {
    try {
      const { email } = z.object({ email: z.string().email().max(255) }).parse(req.body);
      const owner = await BusinessOwner.findOne({ email: email.toLowerCase(), status: 'ACTIVE' });
      if (owner) {
        const token = await ownerAuthService.issueSetPassword(owner, { invalidatePassword: false });
        const url = `${env.passwordResetBaseUrl}?token=${encodeURIComponent(token)}`;
        await mailService.sendPasswordLink({ email: owner.email, url, purpose: 'reset' });
      }
      return apiResponse(res, { message: 'If an active owner account exists, a password link has been sent' });
    } catch (error) { next(error); }
  },
  async me(req, res, next) { try { const owner = await ownerAuthService.safeProfile(req.session.owner.id); return apiResponse(res, { data: safeOwner(owner) }); } catch (error) { next(error); } },
  async profile(req, res, next) { return ownerAuthController.me(req, res, next); },
  async updateProfile(req, res, next) {
    try {
      const input = z.object({ currentPassword: z.string().min(1), firstName: z.string().trim().min(1).max(100).optional(), lastName: z.string().max(100).optional(), email: z.string().email().max(255).optional(), phone: z.string().max(50).optional(), newPassword: newPassword.optional() }).refine((value) => value.firstName || value.lastName !== undefined || value.email || value.phone !== undefined || value.newPassword, 'At least one field to update is required').parse(req.body);
      const owner = await BusinessOwner.findById(req.session.owner.id).select('+passwordHash');
      if (!owner || !owner.passwordHash || !(await bcrypt.compare(input.currentPassword, owner.passwordHash))) throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
      if (input.newPassword) await ownerAuthService.assertPasswordStrength(owner._id, input.newPassword);
      for (const key of ['firstName', 'lastName', 'phone']) if (input[key] !== undefined) owner[key] = input[key];
      if (input.email) owner.email = input.email.toLowerCase();
      if (input.newPassword) { owner.passwordHash = await bcrypt.hash(input.newPassword, 12); owner.passwordSetAt = new Date(); }
      await owner.save();
      req.session.owner = { ...req.session.owner, ...safeOwner(owner) };
      return apiResponse(res, { data: safeOwner(owner) });
    } catch (error) { next(error); }
  },
};
