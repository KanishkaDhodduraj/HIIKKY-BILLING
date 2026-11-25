import { z } from 'zod';
import Subscription from '../../models/Subscription.js';
import Subscriber from '../../models/Subscriber.js';
import Discount from '../../models/Discount.js';
import Billing from '../../models/Billing.js';
import { createCrudModule } from '../shared/crudModule.js';

export default createCrudModule({
  Model: Subscription, basePath: 'subscriptions',
  fields: { planName: z.string().trim().min(1).max(100), description: z.string().max(1000).optional(), price: z.number().finite().min(0), billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONE_TIME']), maxUsers: z.number().int().min(1).nullable().optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() },
  sorts: ['id', 'planName', 'price', 'billingCycle', 'status', 'createdAt'], searchFields: ['planName', 'description'], statusValues: ['ACTIVE', 'INACTIVE'],
  beforeRemove: async (req, id, repository) => {
    const plan = await repository.find(req, id);
    if (!plan) throw Object.assign(new Error('Subscription plan not found'), { status: 404 });
    const scope = repository.scope(req, { subscriptionId: plan._id });
    const [subscriberCount, discountCount, billingCount] = await Promise.all([
      Subscriber.countDocuments(scope),
      Discount.countDocuments(scope),
      Billing.countDocuments(scope),
    ]);
    if (subscriberCount || discountCount || billingCount) {
      throw Object.assign(new Error('This subscription plan is in use and cannot be deleted'), { status: 409, fieldErrors: { plan: 'Reassign or remove linked subscribers, discounts, and invoices first' } });
    }
  },
});
