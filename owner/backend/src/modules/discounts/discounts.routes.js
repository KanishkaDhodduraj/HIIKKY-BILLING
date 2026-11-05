import { z } from 'zod';
import Discount from '../../models/Discount.js';
import Subscription from '../../models/Subscription.js';
import { createCrudModule, scopedReference } from '../shared/crudModule.js';

export default createCrudModule({
  Model: Discount, basePath: 'discounts',
  fields: { code: z.string().trim().min(1).max(50), discountName: z.string().trim().min(1).max(150), discountType: z.enum(['PERCENTAGE', 'FIXED']), discountValue: z.number().finite().min(0), maxUses: z.number().int().min(1).nullable().optional(), startDate: z.coerce.date().nullable().optional(), endDate: z.coerce.date().nullable().optional(), reason: z.string().max(500).optional(), subscriptionId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'SCHEDULED']).optional() },
  sorts: ['id', 'code', 'discountName', 'discountType', 'discountValue', 'status', 'endDate', 'createdAt'], searchFields: ['code', 'discountName', 'reason'], statusValues: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SCHEDULED'],
  beforeSave: async (req, data) => { if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) throw Object.assign(new Error('Percentage discounts cannot exceed 100'), { status: 400, fieldErrors: { discountValue: 'Must be 100 or less' } }); if (data.subscriptionId) await scopedReference(Subscription, data.subscriptionId, req, 'Subscription'); if (data.code) data.code = data.code.toUpperCase(); },
});
