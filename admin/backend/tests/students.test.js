import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import Subscriber from '../src/models/Subscriber.js';
import Billing from '../src/models/Billing.js';
import Payment from '../src/models/Payment.js';

let repl;
let server;
let owner;
let organization;
let student;
let agent;
let csrfToken;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  server = createApp().listen(0);
}, 120000);

afterEach(async () => {
  for (const Model of [AdminAccount, BusinessOwner, Organization, Subscriber, Billing, Payment]) await Model.deleteMany({});
  await mongoose.connection.collection('student_sessions').deleteMany({});
});

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await repl?.stop();
});

async function setup() {
  await AdminAccount.create({ email: 'admin@students.test', passwordHash: await bcrypt.hash('AdminPassword123!', 4), role: 'SUPER_ADMIN', enabled: true });
  owner = await BusinessOwner.create({ firstName: 'Owner', email: 'owner@admin-students.test', status: 'ACTIVE' });
  organization = await Organization.create({ name: 'Report Academy', email: 'academy@admin-students.test', ownerId: owner._id });
  student = await Subscriber.create({ organizationId: organization._id, fullName: 'Learner Report', email: 'learner@admin-students.test', status: 'ACTIVE', registrationStatus: 'APPROVED' });
  agent = request.agent(server);
  const csrf = await agent.get('/api/admin/auth/csrf');
  const login = await agent.post('/api/admin/auth/login').set('X-CSRF-TOKEN', csrf.body.data.token).send({ email: 'admin@students.test', password: 'AdminPassword123!' });
  expect(login.status).toBe(200);
  csrfToken = (await agent.get('/api/admin/auth/csrf')).body.data.token;
}

test('Admin student report and dashboard expose organization counts without credentials', async () => {
  await setup();
  await Subscriber.create({ organizationId: organization._id, fullName: 'Blocked Learner', email: 'blocked@admin-students.test', status: 'ACTIVE', accessBlocked: true });
  const report = await agent.get('/api/admin/students').query({ organizationId: String(organization._id), search: 'Learner Report' });
  expect(report.status).toBe(200);
  expect(report.headers['x-total-count']).toBe('1');
  expect(report.body.data[0]).toMatchObject({ fullName: 'Learner Report', organizationName: 'Report Academy', status: 'ACTIVE' });
  expect(report.body.data[0].passwordHash).toBeUndefined();
  const dashboard = await agent.get('/api/admin/dashboard');
  expect(dashboard.status).toBe(200);
  expect(dashboard.body.data.platformSummary.studentCount).toBe(2);
  expect(dashboard.body.data.studentCountsByOrganization.find((row) => row.organizationId === String(organization._id))).toMatchObject({ total: 2, active: 1, blocked: 1 });
  const csv = await agent.get('/api/admin/students/export.csv');
  expect(csv.status).toBe(200);
  expect(csv.text).toContain('Learner Report');
});

test('Admin block/unblock invalidates student session and is reflected in the report', async () => {
  await setup();
  const sessions = mongoose.connection.collection('student_sessions');
  await sessions.insertOne({ _id: 'admin-student-session', session: JSON.stringify({ cookie: {}, student: { id: String(student._id), organizationId: String(organization._id) } }), expires: new Date(Date.now() + 60_000) });
  const blocked = await agent.patch(`/api/admin/students/${student._id}/block`).set('X-CSRF-TOKEN', csrfToken).send({ reason: 'Account review' });
  expect(blocked.status).toBe(200);
  expect(await sessions.countDocuments({})).toBe(0);
  expect((await agent.get('/api/admin/students')).body.data[0].status).toBe('BLOCKED');
  expect((await agent.patch(`/api/admin/students/${student._id}/unblock`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(200);
  expect((await agent.get('/api/admin/students')).body.data[0].status).toBe('ACTIVE');
});

test.each(['owner', 'organization'])('deactivating an %s removes its student sessions', async (entity) => {
  await setup();
  const sessions = mongoose.connection.collection('student_sessions');
  await sessions.insertOne({ _id: `cascade-${entity}`, session: JSON.stringify({ cookie: {}, student: { id: String(student._id), organizationId: String(organization._id) } }), expires: new Date(Date.now() + 60_000) });
  const path = entity === 'owner'
    ? `/api/admin/business-owners/${owner._id}/status`
    : `/api/admin/organizations/${organization._id}/status`;
  const response = await agent.patch(path).set('X-CSRF-TOKEN', csrfToken).send({ status: 'INACTIVE' });
  expect(response.status).toBe(200);
  expect(await sessions.countDocuments({})).toBe(0);
});

test('Admin student payment report reflects the shared paid invoice and sandbox ledger', async () => {
  await setup();
  const invoice = await Billing.create({
    organizationId: organization._id, subscriberId: student._id, invoiceNumber: 'INV-ADMIN-STUDENT',
    paymentName: 'Course plan', dueDate: new Date(), paidDate: new Date(), amount: 75, paymentStatus: 'PAID', paymentMethod: 'SANDBOX_CARD',
  });
  await Payment.create({
    organizationId: organization._id, subscriberId: student._id, billingId: invoice._id,
    idempotencyKey: 'admin-payment-report-once', amount: 75, currency: 'USD', provider: 'SANDBOX',
    providerReference: 'SBX-ADMIN-TEST', paymentMethodType: 'CARD', status: 'SUCCEEDED',
  });
  const report = await agent.get('/api/admin/students/payments');
  expect(report.status).toBe(200);
  expect(report.body.data[0]).toMatchObject({ invoiceNumber: 'INV-ADMIN-STUDENT', studentName: 'Learner Report', amount: 75, providerReference: 'SBX-ADMIN-TEST' });
  expect((await agent.get('/api/admin/students/payments/export.csv')).text).toContain('SBX-ADMIN-TEST');
});
