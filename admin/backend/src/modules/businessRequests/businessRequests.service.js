import BusinessRequest from '../../models/BusinessRequest.js';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import { createInviteCredential } from '../owners/ownerInvite.service.js';

const keyOf = (value) => [value.ownerEmail.toLowerCase(), value.organizationName.trim().toLowerCase(), value.organizationEmail.toLowerCase()].join('|');

export const requestsService = {
  async intake(input) {
    const values = { ...input, ownerEmail: input.ownerEmail.toLowerCase(), organizationEmail: input.organizationEmail.toLowerCase() };
    return BusinessRequest.create({ ...values, pendingKey: keyOf(values) });
  },
  async decide(id, decision, adminId, reason) {
    const session = await BusinessRequest.startSession();
    const inviteCredential = decision === 'APPROVED' ? createInviteCredential() : null;
    try {
      let result;
      let createdOwner;
      await session.withTransaction(async () => {
        const application = await BusinessRequest.findById(id).session(session);
        if (!application) throw Object.assign(new Error('Business request not found'), { status: 404 });
        if (application.status !== 'PENDING') throw Object.assign(new Error('Business request has already been decided'), { status: 409 });
        let owner;
        let organization;
        if (decision === 'APPROVED') {
          [owner] = await BusinessOwner.create([{
            firstName: application.firstName, lastName: application.lastName || '', email: application.ownerEmail,
            phone: application.ownerPhone || '', status: 'ACTIVE', setPasswordTokenHash: inviteCredential.tokenHash,
            setPasswordTokenExpiresAt: inviteCredential.expiresAt,
          }], { session });
          [organization] = await Organization.create([{
            name: application.organizationName, email: application.organizationEmail, phone: application.organizationPhone || '',
            address: application.organizationAddress || '', industry: application.industry || '',
            projectedStudentCount: application.projectedStudentCount ?? null, operatingRegion: application.operatingRegion || '',
            subscriptionTier: application.subscriptionTier || '', ownerId: owner._id, status: 'ACTIVE',
          }], { session });
        }
        application.status = decision;
        application.decisionReason = reason;
        application.decidedAt = new Date();
        application.decidedByAdminId = adminId;
        application.createdOwnerId = owner?._id;
        application.createdOrganizationId = organization?._id;
        application.pendingKey = undefined;
        application.history.push({ eventType: decision, actorAdminId: adminId, reason, createdOwnerId: owner?._id, createdOrganizationId: organization?._id });
        await application.save({ session });
        result = application;
        createdOwner = owner;
      });
      if (createdOwner && inviteCredential) Object.defineProperty(result, '_ownerInvite', { value: { owner: createdOwner, token: inviteCredential.token } });
      return result;
    } finally { await session.endSession(); }
  },
};
