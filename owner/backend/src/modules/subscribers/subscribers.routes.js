import { z } from 'zod';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import { createCrudModule, scopedReference } from '../shared/crudModule.js';

export default createCrudModule({
  Model: Subscriber, basePath: 'subscribers',
  fields: { subscriptionId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(), fullName: z.string().trim().min(1).max(150), email: z.string().email().max(255), phone: z.string().max(50).optional(), startDate: z.coerce.date().optional(), endDate: z.coerce.date().nullable().optional(), status: z.enum(['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE']).optional(), autoPayEnabled: z.boolean().optional() },
  sorts: ['id', 'fullName', 'email', 'status', 'startDate', 'createdAt'], searchFields: ['fullName', 'email', 'phone'], statusValues: ['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE'],
  beforeSave: async (req, data) => { if (data.subscriptionId) await scopedReference(Subscription, data.subscriptionId, req, 'Subscription'); if (data.email) data.email = data.email.toLowerCase(); },
});
