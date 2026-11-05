import BusinessRequest from '../../models/BusinessRequest.js';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';

const pendingKey = (input) => [input.ownerEmail.toLowerCase(), input.organizationName.trim().toLowerCase(), input.organizationEmail.toLowerCase()].join('|');
export const registrationRepository = {
  async assertAvailable(input) {
    const [owner, organization, duplicate] = await Promise.all([
      BusinessOwner.exists({ email: input.ownerEmail.toLowerCase() }),
      Organization.exists({ $or: [{ name: input.organizationName.trim() }, { email: input.organizationEmail.toLowerCase() }] }),
      BusinessRequest.exists({ pendingKey: pendingKey(input), status: 'PENDING' }),
    ]);
    if (owner || organization) throw Object.assign(new Error('A business owner or organization already uses these details'), { status: 409 });
    if (duplicate) throw Object.assign(new Error('A registration request for this organization is already pending'), { status: 409 });
  },
  create(input) { return BusinessRequest.create({ ...input, ownerEmail: input.ownerEmail.toLowerCase(), organizationEmail: input.organizationEmail.toLowerCase(), pendingKey: pendingKey(input), documentsSkipped: input.documentsSkipped ?? true, termsAcceptedAt: new Date() }); },
  findPublicStatus(id) { return BusinessRequest.findById(id).select('status createdAt decidedAt createdOwnerId'); },
};
