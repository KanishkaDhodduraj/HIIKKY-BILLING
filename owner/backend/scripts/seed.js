import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import PlatformPlan from '../src/models/PlatformPlan.js';
import Subscription from '../src/models/Subscription.js';
import Subscriber from '../src/models/Subscriber.js';
import Course from '../src/models/Course.js';
import CourseInstallment from '../src/models/CourseInstallment.js';
import Billing from '../src/models/Billing.js';
import Discount from '../src/models/Discount.js';
import BillingNotification from '../src/models/BillingNotification.js';

const { MONGODB_URI, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD } = process.env;
if (!MONGODB_URI || !SEED_OWNER_EMAIL || !SEED_OWNER_PASSWORD) throw new Error('Set MONGODB_URI, SEED_OWNER_EMAIL, and SEED_OWNER_PASSWORD before seeding.');
if (SEED_OWNER_PASSWORD.length < 12 || Buffer.byteLength(SEED_OWNER_PASSWORD) > 72) throw new Error('SEED_OWNER_PASSWORD must be 12..72 UTF-8 bytes.');

await mongoose.connect(MONGODB_URI);
try {
  const email = SEED_OWNER_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(SEED_OWNER_PASSWORD, 12);
  const owner = await BusinessOwner.findOneAndUpdate({ email }, { $set: { firstName: 'Alex', lastName: 'Rivera', phone: '+1 (555) 010-2024', status: 'ACTIVE', passwordHash, passwordSetAt: new Date(), setPasswordTokenHash: null, setPasswordTokenExpiresAt: null } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const organization = await Organization.findOneAndUpdate({ email: 'hello@hiikky-demo.local' }, { $set: { name: 'HIikky Learning Systems', ownerId: owner._id, phone: '+1 (555) 010-2024', address: '123 Tech Campus Dr, Austin, TX', industry: 'E-Learning', projectedStudentCount: 12842, operatingRegion: 'North America', subscriptionTier: 'Professional', status: 'ACTIVE' } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  for (const plan of [
    { planName: 'Starter', description: 'For growing organizations', price: 299, billingCycle: 'MONTHLY', maxUsers: 500 },
    { planName: 'Professional', description: 'Advanced analytics and priority support', price: 899, billingCycle: 'MONTHLY', maxUsers: 5000 },
  ]) await PlatformPlan.findOneAndUpdate({ planName: plan.planName }, { $set: { ...plan, status: 'ACTIVE' } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const plans = {};
  for (const plan of [
    { planName: 'Front-end', description: 'HTML, CSS, and JavaScript', price: 19, billingCycle: 'MONTHLY', maxUsers: 500 },
    { planName: 'Back-end', description: 'Java and server development', price: 49, billingCycle: 'MONTHLY', maxUsers: 500 },
    { planName: 'Full-stack', description: 'Complete web development', price: 99, billingCycle: 'MONTHLY', maxUsers: 1000 },
  ]) plans[plan.planName] = await Subscription.findOneAndUpdate({ organizationId: organization._id, planName: plan.planName }, { $set: { ...plan, organizationId: organization._id, status: 'ACTIVE' } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const people = [
    ['Jordan Smith', 'jordan.smith@example.test', 'Front-end', 'ACTIVE'],
    ['Maya Lopez', 'maya.lopez@example.test', 'Full-stack', 'TRIALING'],
    ['Thomas Klein', 'thomas.klein@example.test', 'Back-end', 'SUSPENDED'],
    ['Aria Wong', 'aria.wong@example.test', 'Front-end', 'ACTIVE'],
    ['David Chen', 'david.chen@example.test', 'Back-end', 'ACTIVE'],
  ];
  const subscribers = {};
  for (let index = 0; index < people.length; index += 1) {
    const [fullName, userEmail, planName, status] = people[index];
    subscribers[userEmail] = await Subscriber.findOneAndUpdate({ organizationId: organization._id, email: userEmail }, { $set: { organizationId: organization._id, subscriptionId: plans[planName]._id, fullName, email: userEmail, phone: `+1 555 010 ${String(2100 + index)}`, status, startDate: new Date(Date.now() - index * 86400000), endDate: new Date(Date.now() + (index + 5) * 86400000), autoPayEnabled: index % 2 === 0 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  const courses = [];
  for (const course of [
    { courseCode: 'HTML-CSS', courseName: 'HTML & CSS', category: 'Front-end', instructorName: 'Sarah Miller', durationHours: 120, price: 199, status: 'PUBLISHED' },
    { courseCode: 'JS-101', courseName: 'JavaScript Essentials', category: 'Front-end', instructorName: 'David Park', durationHours: 95, price: 249, status: 'PUBLISHED' },
    { courseCode: 'REACT-UI', courseName: 'React & Modern UI', category: 'Front-end', instructorName: 'Elena Rodriguez', durationHours: 220, price: 399, status: 'DRAFT' },
    { courseCode: 'JAVA-PRG', courseName: 'Java Programming', category: 'Back-end', instructorName: 'Dr. James Gosling', durationHours: 245, price: 299, status: 'PUBLISHED' },
    { courseCode: 'SPRING-MSA', courseName: 'Spring Boot & Microservices', category: 'Back-end', instructorName: 'Chen Wu', durationHours: 320, price: 499, status: 'SCHEDULED' },
    { courseCode: 'FULL-STACK', courseName: 'Full-stack Mastery', category: 'Full-stack', instructorName: 'Alex Rivera', durationHours: 600, price: 899, status: 'PUBLISHED' },
  ]) courses.push(await Course.findOneAndUpdate({ organizationId: organization._id, courseCode: course.courseCode }, { $set: { ...course, organizationId: organization._id } }, { upsert: true, new: true, setDefaultsOnInsert: true }));
  const introCourse = courses[0];
  for (const installment of [{ installmentNumber: 1, installmentName: 'Enrollment', amount: 99, dueDays: 0 }, { installmentNumber: 2, installmentName: 'Course completion', amount: 100, dueDays: 45 }]) await CourseInstallment.findOneAndUpdate({ organizationId: organization._id, courseId: introCourse._id, installmentNumber: installment.installmentNumber }, { $set: { ...installment, organizationId: organization._id, courseId: introCourse._id } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const promos = [
    { code: 'WELCOME10', discountName: 'Welcome discount', discountType: 'PERCENTAGE', discountValue: 10, maxUses: 500, usedCount: 275, status: 'ACTIVE' },
    { code: 'BLACKFRIDAY', discountName: 'Black Friday', discountType: 'FIXED', discountValue: 50, maxUses: 120, usedCount: 80, status: 'SCHEDULED' },
    { code: 'EARLYBIRD', discountName: 'Early bird', discountType: 'PERCENTAGE', discountValue: 20, maxUses: 200, usedCount: 200, status: 'EXPIRED' },
  ];
  for (const promo of promos) await Discount.findOneAndUpdate({ organizationId: organization._id, code: promo.code }, { $set: { ...promo, organizationId: organization._id, startDate: new Date(Date.now() - 30 * 86400000), endDate: new Date(Date.now() + 60 * 86400000) } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const records = [
    { invoiceNumber: 'INV-2401', paymentName: 'Monthly subscription', subscriber: 'jordan.smith@example.test', amount: 19, paymentStatus: 'PAID', paidDate: new Date() },
    { invoiceNumber: 'INV-2402', paymentName: 'Full-stack course', subscriber: 'maya.lopez@example.test', amount: 399, paymentStatus: 'UNPAID' },
    { invoiceNumber: 'INV-2403', paymentName: 'Back-end subscription', subscriber: 'thomas.klein@example.test', amount: 49, paymentStatus: 'OVERDUE' },
    { invoiceNumber: 'INV-2404', paymentName: 'Course installment', subscriber: 'aria.wong@example.test', amount: 99, paymentStatus: 'PAID', paidDate: new Date() },
    { invoiceNumber: 'INV-2405', paymentName: 'Monthly subscription', subscriber: 'david.chen@example.test', amount: 49, paymentStatus: 'UNPAID' },
  ];
  for (const record of records) await Billing.findOneAndUpdate({ organizationId: organization._id, invoiceNumber: record.invoiceNumber }, { $set: { organizationId: organization._id, subscriberId: subscribers[record.subscriber]._id, subscriptionId: subscribers[record.subscriber].subscriptionId, invoiceNumber: record.invoiceNumber, paymentName: record.paymentName, dueDate: new Date(Date.now() + 7 * 86400000), amount: record.amount, originalAmount: record.amount, discountAmount: 0, paymentStatus: record.paymentStatus, paidDate: record.paidDate || null } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const notices = [
    { recipientEmail: 'jordan.smith@example.test', notificationType: 'ANNOUNCEMENT', subject: 'Platform maintenance', status: 'SENT' },
    { recipientEmail: 'maya.lopez@example.test', notificationType: 'SYSTEM_ALERT', subject: 'New course module released', status: 'QUEUED' },
    { recipientEmail: 'thomas.klein@example.test', notificationType: 'BILLING', subject: 'Billing cycle reminder', status: 'SENT' },
  ];
  for (const notice of notices) await BillingNotification.findOneAndUpdate({ organizationId: organization._id, recipientEmail: notice.recipientEmail, subject: notice.subject }, { $set: { ...notice, organizationId: organization._id, message: 'This is a sample notification in your local demo workspace.', sentAt: notice.status === 'SENT' ? new Date() : null } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  console.info(`Seeded owner workspace ${organization.name} for ${email}.`);
} finally { await mongoose.disconnect(); }
