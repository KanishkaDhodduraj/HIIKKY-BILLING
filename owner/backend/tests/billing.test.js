import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import Subscription from '../src/models/Subscription.js';
import Subscriber from '../src/models/Subscriber.js';
import Discount from '../src/models/Discount.js';
import Billing from '../src/models/Billing.js';
import BillingNotification from '../src/models/BillingNotification.js';

let repl;
let server;
let app;
beforeAll(async () => { repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(repl.getUri()); app = createApp(); server = app.listen(0); }, 120000);
afterEach(async () => { for (const Model of [BusinessOwner, Organization, Subscription, Subscriber, Discount, Billing, BillingNotification]) await Model.deleteMany({}); });
afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); await mongoose.disconnect(); await repl?.stop(); });

async function setup() {
  const owner = await BusinessOwner.create({ firstName: 'Sam', email: 'sam@billing.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() });
  const organization = await Organization.create({ name: 'Sam Institute', email: 'hello@sam.test', ownerId: owner._id });
  const subscription = await Subscription.create({ organizationId: organization._id, planName: 'Professional', price: 899, billingCycle: 'MONTHLY' });
  const subscriber = await Subscriber.create({ organizationId: organization._id, subscriptionId: subscription._id, fullName: 'Learner One', email: 'learner@sam.test' });
  const discount = await Discount.create({ organizationId: organization._id, code: 'SAVE10', discountName: 'Ten percent', discountType: 'PERCENTAGE', discountValue: 10, maxUses: 1 });
  const agent = request.agent(server);
  const csrf = await agent.get('/api/owner/auth/csrf');
  const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrf.body.data.token).send({ email: owner.email, password: 'StrongPassword123' });
  return { organization, subscription, subscriber, discount, agent, csrfToken: login.body.data.csrfToken };
}

test('invoice generation applies scoped discounts, payment marking, and queues reminders', async () => {
  const { agent, csrfToken, subscriber, subscription, discount } = await setup();
  const generated = await agent.post('/api/owner/invoices').set('X-CSRF-TOKEN', csrfToken).send({ subscriberId: String(subscriber._id), subscriptionId: String(subscription._id), paymentName: 'June subscription', dueDate: '2026-11-30', discountCode: 'save10' });
  expect(generated.status).toBe(201);
  expect(generated.body.data.originalAmount).toBe(899);
  expect(generated.body.data.discountAmount).toBeCloseTo(89.9);
  expect(generated.body.data.amount).toBeCloseTo(809.1);
  expect(await Discount.findById(discount._id).then((row) => row.usedCount)).toBe(1);
  const reminder = await agent.post(`/api/owner/invoices/${generated.body.data.id}/notify`).set('X-CSRF-TOKEN', csrfToken).send({ message: 'Please pay by the due date.' });
  expect(reminder.status).toBe(201);
  expect(reminder.body.data.status).toBe('QUEUED');
  const paid = await agent.patch(`/api/owner/invoices/${generated.body.data.id}/paid`).set('X-CSRF-TOKEN', csrfToken).send({});
  expect(paid.status).toBe(200);
  expect(paid.body.data.paymentStatus).toBe('PAID');
  expect(paid.body.data.paidDate).toBeTruthy();
  expect(await BillingNotification.countDocuments()).toBe(1);
});

test('invoice endpoints hide foreign-organization records and CSV is capped', async () => {
  const { agent, csrfToken } = await setup();
  const otherOwner = await BusinessOwner.create({ firstName: 'Other', email: 'other@billing.test' });
  const otherOrg = await Organization.create({ name: 'Other Institute', email: 'other@sam.test', ownerId: otherOwner._id });
  const foreign = await Billing.create({ organizationId: otherOrg._id, invoiceNumber: 'INV-OTHER', paymentName: 'Other invoice', dueDate: new Date(), amount: 50 });
  expect((await agent.get(`/api/owner/invoices/${foreign._id}`)).status).toBe(404);
  expect((await agent.patch(`/api/owner/invoices/${foreign._id}/paid`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(404);
  const spy = jest.spyOn(Billing, 'countDocuments').mockResolvedValue(10001);
  try { expect((await agent.get('/api/owner/invoices/export.csv')).status).toBe(413); }
  finally { spy.mockRestore(); }
});

test('dashboard and analytics aggregate organization invoices and subscribers only', async () => {
  const { agent, organization, subscriber, subscription } = await setup();
  await Subscriber.create({ organizationId: organization._id, subscriptionId: subscription._id, fullName: 'Learner Two', email: 'two@sam.test' });
  await Billing.create({ organizationId: organization._id, subscriberId: subscriber._id, subscriptionId: subscription._id, invoiceNumber: 'INV-OWN', paymentName: 'Course fee', dueDate: new Date(), paidDate: new Date(), amount: 200, paymentStatus: 'PAID' });
  const otherOwner = await BusinessOwner.create({ firstName: 'Other', email: 'elsewhere@billing.test' });
  const otherOrg = await Organization.create({ name: 'Other Dashboard', email: 'elsewhere@sam.test', ownerId: otherOwner._id });
  await Billing.create({ organizationId: otherOrg._id, invoiceNumber: 'INV-FOREIGN', paymentName: 'Foreign fee', dueDate: new Date(), amount: 90000, paymentStatus: 'PAID' });
  const dashboard = await agent.get('/api/owner/dashboard');
  expect(dashboard.status).toBe(200);
  expect(dashboard.body.data.summary.totalRevenue).toBe(200);
  expect(dashboard.body.data.summary.activeSubscribers).toBe(2);
  expect(dashboard.body.data.summary.monthlyRecurringRevenue).toBe(1798);
  const revenue = await agent.get('/api/owner/analytics/revenue').query({ fromDate: '2026-11-01', toDate: '2026-11-30' });
  expect(revenue.status).toBe(200);
  expect(revenue.body.data.summary.totalRevenue).toBe(200);
});
