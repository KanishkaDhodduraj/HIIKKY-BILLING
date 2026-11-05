import Billing from '../../models/Billing.js';
import { createOwnerRepository, tenantFilter } from '../shared/ownerRepository.js';

const repository = createOwnerRepository(Billing);
export const billingRepository = {
  ...repository,
  find(req, id, extra = {}) { const orgIds = req.ownerOrganizationIds || []; return Billing.findOne(tenantFilter(req, { _id: id, ...extra })).populate({ path: 'subscriberId', select: 'fullName email', match: { organizationId: { $in: orgIds } } }).populate({ path: 'subscriptionId', select: 'planName price billingCycle', match: { organizationId: { $in: orgIds } } }); },
};
