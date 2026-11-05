import { z } from 'zod';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, setPageHeaders, regex } from '../../utils/query.js';
import { invitationStatus, ownerInviteService } from './ownerInvite.service.js';

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const fields = { firstName: z.string().trim().min(1).max(100), lastName: z.string().max(100).optional(), email: z.string().email().max(255), phone: z.string().max(50).regex(/^[+0-9() .-]*$/).optional() };
function check(id) { if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid id'), { status: 400 }); }

async function populated(owner) {
  const organizations = await Organization.find({ ownerId: owner._id }).select('name email phone status');
  return {
    id: String(owner._id), firstName: owner.firstName, lastName: owner.lastName,
    fullName: [owner.firstName, owner.lastName].filter(Boolean).join(' '), email: owner.email, phone: owner.phone,
    status: owner.status, inviteStatus: invitationStatus(owner), passwordSetAt: owner.passwordSetAt || null,
    createdAt: owner.createdAt, updatedAt: owner.updatedAt,
    organizations: organizations.map((organization) => ({ id: String(organization._id), name: organization.name, email: organization.email, phone: organization.phone, status: organization.status })),
  };
}

export const ownersController = {
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'firstName', 'lastName', 'email', 'status', 'createdAt', 'updatedAt']);
      const filter = {};
      if (req.query.status) {
        if (!['ACTIVE', 'INACTIVE'].includes(req.query.status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
        filter.status = req.query.status;
      }
      if (req.query.organizationId) {
        check(req.query.organizationId);
        const organization = await Organization.findById(req.query.organizationId);
        if (!organization) throw Object.assign(new Error('Organization not found'), { status: 404 });
        filter._id = organization.ownerId || { $in: [] };
      }
      if (req.query.search) {
        if (String(req.query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
        const query = regex(String(req.query.search));
        filter.$or = [{ firstName: query }, { lastName: query }, { email: query }, { phone: query }];
      }
      const [rows, total] = await Promise.all([BusinessOwner.find(filter).sort(page.sort).skip(page.skip).limit(page.size), BusinessOwner.countDocuments(filter)]);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: await Promise.all(rows.map(populated)) });
    } catch (error) { next(error); }
  },
  async create(req, res, next) {
    try {
      const input = z.object(fields).parse(req.body);
      const owner = await BusinessOwner.create({ ...input, email: input.email.toLowerCase(), status: 'ACTIVE' });
      await ownerInviteService.issue(owner);
      return apiResponse(res, { status: 201, message: 'Owner created and invitation sent', data: await populated(owner) });
    } catch (error) { next(error); }
  },
  async get(req, res, next) {
    try {
      check(req.params.id);
      const owner = await BusinessOwner.findById(req.params.id);
      if (!owner) throw Object.assign(new Error('Business owner not found'), { status: 404 });
      return apiResponse(res, { data: await populated(owner) });
    } catch (error) { next(error); }
  },
  async update(req, res, next) {
    try {
      check(req.params.id);
      const input = z.object({ ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.optional()])), status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).parse(req.body);
      const owner = await BusinessOwner.findByIdAndUpdate(req.params.id, { $set: input }, { new: true, runValidators: true });
      if (!owner) throw Object.assign(new Error('Business owner not found'), { status: 404 });
      if (owner.status === 'INACTIVE') await ownerInviteService.invalidateSessions(owner._id);
      return apiResponse(res, { data: await populated(owner) });
    } catch (error) { next(error); }
  },
  async resendInvite(req, res, next) {
    try {
      check(req.params.id);
      const owner = await BusinessOwner.findById(req.params.id);
      if (!owner) throw Object.assign(new Error('Business owner not found'), { status: 404 });
      if (owner.status !== 'ACTIVE') throw Object.assign(new Error('Activate the owner before sending an invitation'), { status: 400 });
      await ownerInviteService.issue(owner);
      return apiResponse(res, { message: 'Owner invitation sent', data: await populated(owner) });
    } catch (error) { next(error); }
  },
  async resetPassword(req, res, next) {
    try {
      check(req.params.id);
      const owner = await BusinessOwner.findById(req.params.id).select('+passwordHash');
      if (!owner) throw Object.assign(new Error('Business owner not found'), { status: 404 });
      if (owner.status !== 'ACTIVE') throw Object.assign(new Error('Activate the owner before resetting the password'), { status: 400 });
      await ownerInviteService.issue(owner, { reset: true });
      await ownerInviteService.invalidateSessions(owner._id);
      return apiResponse(res, { message: 'Password reset link sent', data: await populated(owner) });
    } catch (error) { next(error); }
  },
  async status(req, res, next) {
    try {
      const input = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']).optional(), enabled: z.boolean().optional() }).refine((value) => value.status || value.enabled !== undefined, 'Status is required').parse(req.body);
      req.body = { status: input.status || (input.enabled ? 'ACTIVE' : 'INACTIVE') };
      return ownersController.update(req, res, next);
    } catch (error) { next(error); }
  },
  async activate(req, res, next) { req.body = { status: 'ACTIVE' }; return ownersController.status(req, res, next); },
  async deactivate(req, res, next) { req.body = { status: 'INACTIVE' }; return ownersController.status(req, res, next); },
  async remove(req, res, next) {
    try {
      check(req.params.id);
      const owner = await BusinessOwner.findById(req.params.id);
      if (!owner) throw Object.assign(new Error('Business owner not found'), { status: 404 });
      await ownerInviteService.invalidateSessions(owner._id);
      await Organization.updateMany({ ownerId: owner._id }, { $set: { ownerId: null } });
      await owner.deleteOne();
      return apiResponse(res, { message: 'Business owner deleted' });
    } catch (error) { next(error); }
  },
};
