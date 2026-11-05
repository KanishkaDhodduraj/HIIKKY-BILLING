import { z } from 'zod';
import Subscription from '../../models/Subscription.js';
import { createCrudModule } from '../shared/crudModule.js';

export default createCrudModule({
  Model: Subscription, basePath: 'subscriptions',
  fields: { planName: z.string().trim().min(1).max(100), description: z.string().max(1000).optional(), price: z.number().finite().min(0), billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONE_TIME']), maxUsers: z.number().int().min(1).nullable().optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() },
  sorts: ['id', 'planName', 'price', 'billingCycle', 'status', 'createdAt'], searchFields: ['planName', 'description'], statusValues: ['ACTIVE', 'INACTIVE'],
});
