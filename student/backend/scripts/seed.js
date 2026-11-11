import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import Subscription from '../src/models/Subscription.js';
import Course from '../src/models/Course.js';
import CourseInstallment from '../src/models/CourseInstallment.js';
import Subscriber from '../src/models/Subscriber.js';
import StudentCourse from '../src/models/StudentCourse.js';
import StudentPaymentMethod from '../src/models/StudentPaymentMethod.js';
import Billing from '../src/models/Billing.js';
import Payment from '../src/models/Payment.js';
import BillingNotification from '../src/models/BillingNotification.js';

const mongoUri = process.env.MONGODB_URI;
const studentEmail = (process.env.SEED_STUDENT_EMAIL || 'student@learning-center.test').toLowerCase();
const studentPassword = process.env.SEED_STUDENT_PASSWORD;

if (!mongoUri) throw new Error('MONGODB_URI is required to seed the student workspace.');
if (!studentPassword) throw new Error('SEED_STUDENT_PASSWORD is required; set it in the environment.');

try {
  await mongoose.connect(mongoUri);
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || 'owner@learning-center.test').toLowerCase();
  const owner = await BusinessOwner.findOneAndUpdate(
    { email: ownerEmail },
    { $set: { firstName: 'Learning', lastName: 'Center', status: 'ACTIVE' }, $setOnInsert: { email: ownerEmail } },
    { upsert: true, new: true, runValidators: true },
  );
  const organizationEmail = (process.env.SEED_ORGANIZATION_EMAIL || 'hello@learning-center.test').toLowerCase();
  const organization = await Organization.findOneAndUpdate(
    { email: organizationEmail },
    { $set: { name: process.env.SEED_ORGANIZATION_NAME || 'Learning Center', ownerId: owner._id, status: 'ACTIVE' }, $setOnInsert: { email: organizationEmail } },
    { upsert: true, new: true, runValidators: true },
  );
  const plan = await Subscription.findOneAndUpdate(
    { organizationId: organization._id, planName: 'Learning Plan' },
    { $set: { description: 'Monthly access to the organization learning program.', price: 125, billingCycle: 'MONTHLY', status: 'ACTIVE' } },
    { upsert: true, new: true, runValidators: true },
  );
  const course = await Course.findOneAndUpdate(
    { organizationId: organization._id, courseCode: 'LEARN-101' },
    { $set: { courseName: 'Learning Foundations', category: 'Foundations', instructorName: 'Learning Team', durationHours: 12, price: 125, status: 'PUBLISHED' } },
    { upsert: true, new: true, runValidators: true },
  );
  await CourseInstallment.findOneAndUpdate(
    { organizationId: organization._id, courseId: course._id, installmentNumber: 1 },
    { $set: { installmentName: 'First installment', amount: 125, dueDays: 7, dueDate: new Date(Date.now() + 7 * 86400000) } },
    { upsert: true, new: true, runValidators: true },
  );
  const student = await Subscriber.findOneAndUpdate(
    { organizationId: organization._id, email: studentEmail },
    { $set: {
      fullName: process.env.SEED_STUDENT_NAME || 'Student Account',
      phone: process.env.SEED_STUDENT_PHONE || '',
      subscriptionId: plan._id,
      status: 'ACTIVE',
      registrationStatus: 'APPROVED',
      accessBlocked: false,
      autoPayEnabled: false,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      passwordHash: await bcrypt.hash(studentPassword, 12),
      passwordSetAt: new Date(),
    } },
    { upsert: true, new: true, runValidators: true },
  );
  await StudentCourse.findOneAndUpdate(
    { organizationId: organization._id, subscriberId: student._id, courseId: course._id },
    { $set: { progressPercent: 35, status: 'ACTIVE', lastAccessedAt: new Date() } },
    { upsert: true, new: true, runValidators: true },
  );
  let unpaidInvoice = await Billing.findOne({ organizationId: organization._id, invoiceNumber: 'INV-STUDENT-START-001' });
  if (!unpaidInvoice) {
    unpaidInvoice = await Billing.create({
      organizationId: organization._id, subscriberId: student._id, subscriptionId: plan._id,
      invoiceNumber: 'INV-STUDENT-START-001', paymentName: 'Learning Plan · Monthly',
      dueDate: new Date(Date.now() + 7 * 86400000), amount: 125, originalAmount: 125, paymentStatus: 'UNPAID',
    });
  } else {
    unpaidInvoice.subscriberId = student._id; unpaidInvoice.subscriptionId = plan._id;
    unpaidInvoice.paymentName = 'Learning Plan · Monthly'; unpaidInvoice.amount = 125;
    unpaidInvoice.paymentStatus = 'UNPAID'; unpaidInvoice.paidDate = null;
    await unpaidInvoice.save();
  }
  const paidInvoice = await Billing.findOneAndUpdate(
    { organizationId: organization._id, invoiceNumber: 'INV-STUDENT-START-000' },
    { $set: { subscriberId: student._id, subscriptionId: plan._id, paymentName: 'Learning Plan · Enrollment', dueDate: new Date(), paidDate: new Date(), amount: 75, originalAmount: 75, paymentStatus: 'PAID', paymentMethod: 'SANDBOX_CARD' } },
    { upsert: true, new: true, runValidators: true },
  );
  await Payment.findOneAndUpdate(
    { billingId: paidInvoice._id },
    { $set: { organizationId: organization._id, subscriberId: student._id, idempotencyKey: 'seed-paid-invoice-once', amount: 75, currency: 'USD', provider: 'SANDBOX', providerReference: `SBX-${crypto.createHash('sha256').update(String(paidInvoice._id)).digest('hex').slice(0, 20).toUpperCase()}`, paymentMethodType: 'CARD', status: 'SUCCEEDED', paidAt: paidInvoice.paidDate } },
    { upsert: true, new: true, runValidators: true },
  );
  await StudentPaymentMethod.findOneAndUpdate(
    { organizationId: organization._id, subscriberId: student._id, label: 'Sandbox card' },
    { $set: { type: 'CARD', tokenReference: `sandbox_${crypto.randomBytes(16).toString('hex')}`, brand: 'Sandbox', lastFour: '4242', expiryMonth: 12, expiryYear: 2030, isDefault: true } },
    { upsert: true, new: true, runValidators: true },
  );
  await BillingNotification.findOneAndUpdate(
    { organizationId: organization._id, subscriberId: student._id, subject: 'Welcome to your learning workspace' },
    { $set: { recipientEmail: student.email, recipientName: student.fullName, recipientGroup: 'INDIVIDUAL', notificationType: 'ANNOUNCEMENT', message: 'Your learning workspace is ready. Open My Courses to continue.', status: 'SENT', sentAt: new Date() } },
    { upsert: true, new: true, runValidators: true },
  );
  console.log(`Student workspace ready: ${student.email} at ${organization.name}.`);
} finally {
  await mongoose.disconnect();
}
