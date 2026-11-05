import { registrationRepository } from './registration.repository.js';

export const registrationService = {
  async submit(input) {
    await registrationRepository.assertAvailable(input);
    return registrationRepository.create(input);
  },
  async status(id) {
    const request = await registrationRepository.findPublicStatus(id);
    if (!request) throw Object.assign(new Error('Registration request not found'), { status: 404 });
    return { id: String(request._id), status: request.status, submittedAt: request.createdAt, decidedAt: request.decidedAt || null, ownerCreated: Boolean(request.createdOwnerId) };
  },
};
