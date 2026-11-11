import { z } from 'zod';
import { apiResponse } from '../../utils/apiResponse.js';
import { authService } from './auth.service.js';

const loginSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(72), organizationId: z.string().regex(/^[a-f\d]{24}$/i).optional() });

export const authController = {
  csrf(_req, res) {
    return apiResponse(res, { data: { token: res.locals.csrfToken, headerName: 'X-CSRF-TOKEN' } });
  },
  async organizations(_req, res, next) {
    try { return apiResponse(res, { data: await authService.organizations() }); } catch (error) { return next(error); }
  },
  async register(req, res, next) {
    try { return apiResponse(res, { status: 201, message: 'Registration submitted for owner review', data: await authService.register(req.body) }); } catch (error) { return next(error); }
  },
  async login(req, res, next) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input.email, input.password, input.organizationId);
      if (!result) throw Object.assign(new Error('Unable to sign in. Check your credentials or account status.'), { status: 401 });
      await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.student = { id: String(result.student._id), organizationId: String(result.organization._id) };
      await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
      res.locals.csrfToken = req.csrfToken();
      return apiResponse(res, { message: 'Signed in', data: { ...result.profile, csrfToken: res.locals.csrfToken } });
    } catch (error) { return next(error); }
  },
  async logout(req, res, next) {
    try {
      if (req.session) await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
      res.clearCookie('hiikky.student.sid');
      return apiResponse(res, { message: 'Signed out' });
    } catch (error) { return next(error); }
  },
  async setPassword(req, res, next) {
    try {
      const { token, password } = z.object({ token: z.string().min(1), password: z.string() }).parse(req.body);
      const { student, organization } = await authService.setPassword(token, password);
      return apiResponse(res, { message: 'Password set successfully', data: authService.safeStudent(student, organization) });
    } catch (error) { return next(error); }
  },
  async forgotPassword(req, res, next) {
    try {
      const { email } = z.object({ email: z.string().trim().email().max(255) }).parse(req.body);
      await authService.forgotPassword(email);
      return apiResponse(res, { message: 'If an active account exists, a password link has been sent' });
    } catch (error) { return next(error); }
  },
  async me(req, res, next) {
    try { return apiResponse(res, { data: authService.safeStudent(req.student, req.organization) }); } catch (error) { return next(error); }
  },
  async profile(req, res, next) {
    try { return apiResponse(res, { data: authService.safeStudent(req.student, req.organization) }); } catch (error) { return next(error); }
  },
  async updateProfile(req, res, next) {
    try {
      const student = await authService.updateProfile(req.student, req.body);
      return apiResponse(res, { message: 'Profile updated', data: authService.safeStudent(student, req.organization) });
    } catch (error) { return next(error); }
  },
};
