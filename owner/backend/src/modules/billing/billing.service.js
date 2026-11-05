import crypto from 'node:crypto';
import Billing from '../../models/Billing.js';
import Discount from '../../models/Discount.js';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import Course from '../../models/Course.js';
import { primaryOrganizationId, tenantFilter } from '../shared/ownerRepository.js';

const idError = (label) => Object.assign(new Error(`${label} not found`), { status: 404 });
const discountValue = (discount, amount) => Math.min(amount, discount.discountType === 'PERCENTAGE' ? amount * discount.discountValue / 100 : discount.discountValue);

export const billingService = {
  async createInvoice(req, input) {
    const organizationId = primaryOrganizationId(req);
    if (input.subscriberId && !await Subscriber.exists(tenantFilter(req, { _id: input.subscriberId }))) throw idError('Subscriber');
    const subscription = input.subscriptionId ? await Subscription.findOne(tenantFilter(req, { _id: input.subscriptionId })) : null;
    if (input.subscriptionId && !subscription) throw idError('Subscription');
    const course = input.courseId ? await Course.findOne(tenantFilter(req, { _id: input.courseId })) : null;
    if (input.courseId && !course) throw idError('Course');
    const originalAmount = input.amount ?? subscription?.price ?? course?.price;
    if (!Number.isFinite(originalAmount)) throw Object.assign(new Error('Amount is required unless a plan or course provides a price'), { status: 400, fieldErrors: { amount: 'Amount is required' } });
    const session = await Billing.startSession();
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    try {
      let invoice;
      await session.withTransaction(async () => {
        let discount = null;
        if (input.discountCode) {
          const code = input.discountCode.trim().toUpperCase();
          discount = await Discount.findOne(tenantFilter(req, { code, status: 'ACTIVE' })).session(session);
          const now = new Date();
          if (!discount || (discount.startDate && discount.startDate > now) || (discount.endDate && discount.endDate < now) || (discount.maxUses && discount.usedCount >= discount.maxUses)) throw Object.assign(new Error('Discount is unavailable'), { status: 400, fieldErrors: { discountCode: 'Code is invalid, expired, or exhausted' } });
          discount.usedCount += 1;
          await discount.save({ session });
        }
        const savedDiscount = discount ? discountValue(discount, originalAmount) : 0;
        [invoice] = await Billing.create([{
          organizationId, subscriberId: input.subscriberId || null, subscriptionId: input.subscriptionId || null,
          courseId: input.courseId || null, invoiceNumber, paymentName: input.paymentName,
          dueDate: input.dueDate, amount: Math.max(0, originalAmount - savedDiscount), originalAmount,
          discountAmount: savedDiscount, paymentStatus: 'UNPAID', paymentMethod: input.paymentMethod || '',
        }], { session });
      });
      return invoice;
    } finally { await session.endSession(); }
  },
  async markPaid(req, id, paidDate) {
    const query = tenantFilter(req, { _id: id });
    const invoice = await Billing.findOne(query);
    if (!invoice) throw idError('Invoice');
    invoice.paymentStatus = 'PAID';
    invoice.paidDate = paidDate || new Date();
    await invoice.save();
    return invoice;
  },
};
