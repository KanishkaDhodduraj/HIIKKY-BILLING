import Organization from '../../models/Organization.js';
import OwnerSetting from '../../models/OwnerSetting.js';
import { primaryOrganizationId } from '../shared/ownerRepository.js';

export const settingsRepository = {
  getOrganization(req) { return Organization.findOne({ _id: primaryOrganizationId(req), ownerId: req.owner.id }); },
  find(req, includeSecrets = false) { const query = OwnerSetting.findOne({ organizationId: primaryOrganizationId(req) }); if (includeSecrets) query.select('+gateways.apiKeyCiphertext +emailSettings.passwordCiphertext +security.masterApiKeyHash'); return query; },
  save(req, values) { return OwnerSetting.findOneAndUpdate({ organizationId: primaryOrganizationId(req) }, { $set: values }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }); },
};
