import BillingNotification from '../../models/BillingNotification.js';
import { createOwnerRepository } from '../shared/ownerRepository.js';

export const notificationsRepository = createOwnerRepository(BillingNotification);
