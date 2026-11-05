import { z } from 'zod';
import OwnerSetting from '../../models/OwnerSetting.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { primaryOrganizationId } from '../shared/ownerRepository.js';
import { mailService } from '../auth/mail.service.js';
import { settingsService } from './settings.service.js';

const profile = z.object({ name: z.string().trim().min(1).max(255).optional(), email: z.string().email().max(255).optional(), phone: z.string().max(50).optional(), address: z.string().max(255).optional(), industry: z.string().max(100).optional(), projectedStudentCount: z.number().int().min(0).nullable().optional(), operatingRegion: z.string().max(100).optional() });
const gateway = z.object({ enabled: z.boolean().optional(), publicKey: z.string().max(500).optional(), apiKey: z.string().max(2000).optional() });
const emailSettings = z.object({ smtpHost: z.string().max(255).optional(), port: z.number().int().min(1).max(65535).optional(), encryption: z.enum(['TLS', 'SSL', 'NONE']).optional(), username: z.string().max(255).optional(), password: z.string().max(2000).optional(), fromName: z.string().max(100).optional(), replyTo: z.string().email().max(255).optional() });
const security = z.object({ twoFactorEnabled: z.boolean().optional(), ipWhitelistEnabled: z.boolean().optional(), allowedIPs: z.array(z.string().max(64)).max(50).optional(), autoLogoutMinutes: z.number().int().min(5).max(480).optional(), enforceStrongPassword: z.boolean().optional() });

export const settingsController = {
  async get(req, res, next) { try { return apiResponse(res, { data: await settingsService.get(req) }); } catch (error) { next(error); } },
  async profile(req, res, next) { try { return apiResponse(res, { data: await settingsService.updateProfile(req, profile.parse(req.body)) }); } catch (error) { next(error); } },
  async gateway(req, res, next) { try { return apiResponse(res, { data: await settingsService.updateGateway(req, req.params.provider.toUpperCase(), gateway.parse(req.body)) }); } catch (error) { next(error); } },
  async email(req, res, next) { try { return apiResponse(res, { data: await settingsService.updateEmail(req, emailSettings.parse(req.body)) }); } catch (error) { next(error); } },
  async testEmail(req, res, next) { try { const setting = await OwnerSetting.findOne({ organizationId: primaryOrganizationId(req) }).select('+emailSettings.passwordCiphertext'); if (!setting?.emailSettings?.smtpHost || !setting?.emailSettings?.passwordCiphertext) throw Object.assign(new Error('Save SMTP host and password before sending a test'), { status: 400 }); const result = await mailService.sendTestEmail({ to: setting.emailSettings.replyTo, host: setting.emailSettings.smtpHost }); return apiResponse(res, { message: result.message, data: result }); } catch (error) { next(error); } },
  async security(req, res, next) { try { return apiResponse(res, { data: await settingsService.updateSecurity(req, security.parse(req.body)) }); } catch (error) { next(error); } },
  async rotateApiKey(req, res, next) { try { return apiResponse(res, { message: 'API key rotated. Copy it now; it will not be shown again.', data: await settingsService.rotateApiKey(req) }); } catch (error) { next(error); } },
  async testGateway(req, res, next) { try { const result = await settingsService.gatewayTest(req, req.params.provider.toUpperCase()); return apiResponse(res, { message: result.message, data: result }); } catch (error) { next(error); } },
};
