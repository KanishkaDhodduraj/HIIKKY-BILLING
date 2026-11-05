import { z } from 'zod';
import { apiResponse } from '../../utils/apiResponse.js';
import { registrationService } from './registration.service.js';
import PlatformPlan from '../../models/PlatformPlan.js';

const schema = z.object({
  firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().max(100).optional(),
  ownerEmail: z.string().email().max(255), ownerPhone: z.string().max(50).optional(),
  organizationName: z.string().trim().min(1).max(255), organizationEmail: z.string().email().max(255),
  organizationPhone: z.string().max(50).optional(), organizationAddress: z.string().max(255).optional(),
  industry: z.string().trim().min(1).max(100), projectedStudentCount: z.number().int().min(0),
  operatingRegion: z.string().trim().min(1).max(100), subscriptionTier: z.string().trim().min(1).max(100),
  documentsSkipped: z.boolean().default(true), termsAccepted: z.literal(true),
});
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const registrationController = {
  async plans(_req, res, next) { try { const plans = await PlatformPlan.find({ status: 'ACTIVE' }).sort({ price: 1, planName: 1 }).select('planName description price billingCycle maxUsers'); return apiResponse(res, { data: plans.map((plan) => ({ id: String(plan._id), planName: plan.planName, description: plan.description, price: plan.price, billingCycle: plan.billingCycle, maxUsers: plan.maxUsers })) }); } catch (error) { next(error); } },
  async submit(req, res, next) { try { const application = await registrationService.submit(schema.parse(req.body)); return apiResponse(res, { status: 201, message: 'Registration request submitted for review', data: { id: String(application._id), status: application.status, submittedAt: application.createdAt, documentsSkipped: application.documentsSkipped } }); } catch (error) { next(error); } },
  async status(req, res, next) { try { const id = idSchema.parse(req.params.id); return apiResponse(res, { data: await registrationService.status(id) }); } catch (error) { next(error); } },
};
