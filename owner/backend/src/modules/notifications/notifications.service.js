import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import BillingNotification from '../../models/BillingNotification.js';
import { primaryOrganizationId, tenantFilter } from '../shared/ownerRepository.js';
import { notificationsRepository } from './notifications.repository.js';

export const notificationsService = {
  list(req, options) { return notificationsRepository.list(req, options); },
  async dispatch(req, input) {
    const orgId = primaryOrganizationId(req);
    const filter = tenantFilter(req, {});
    if (input.audience === 'ALL_ACTIVE') filter.status = 'ACTIVE';
    if (input.audience === 'PLAN') {
      if (!input.subscriptionId) throw Object.assign(new Error('Select a subscription plan'), { status: 400, fieldErrors: { subscriptionId: 'A plan is required' } });
      const plan = await Subscription.findOne(tenantFilter(req, { _id: input.subscriptionId }));
      if (!plan) throw Object.assign(new Error('Subscription plan not found'), { status: 404 });
      filter.subscriptionId = plan._id;
    }
    const subscribers = await Subscriber.find(filter).select('fullName email');
    if (subscribers.length > 10000) throw Object.assign(new Error('Notification exceeds the 10,000-recipient limit'), { status: 413 });
    if (!subscribers.length) return { queued: 0 };
    const rows = subscribers.map((subscriber) => ({ organizationId: orgId, subscriberId: subscriber._id, recipientEmail: subscriber.email, recipientName: subscriber.fullName, recipientGroup: input.audience, notificationType: input.notificationType, subject: input.subject, message: input.message, status: 'QUEUED' }));
    await BillingNotification.insertMany(rows);
    return { queued: rows.length };
  },
};
