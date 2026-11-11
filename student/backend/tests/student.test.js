import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import Subscriber from '../src/models/Subscriber.js';
import Subscription from '../src/models/Subscription.js';
import Course from '../src/models/Course.js';
import Billing from '../src/models/Billing.js';
import Payment from '../src/models/Payment.js';

let repl;
let server;
let owner;
let organization;
let secondOwner;
let secondOrganization;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  server = createApp().listen(0);
}, 120000);

afterEach(async () => {
  for (const Model of [BusinessOwner, Organization, Subscriber, Subscription, Course, Billing, Payment]) await Model.deleteMany({});
});

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await repl?.stop();
});

async function setup() {
  [owner, secondOwner] = await BusinessOwner.create([
    { firstName: 'Owner One', email: 'owner-one@student.test', status: 'ACTIVE' },
    { firstName: 'Owner Two', email: 'owner-two@student.test', status: 'ACTIVE' },
  ]);
  [organization, secondOrganization] = await Organization.create([
    { name: 'Student Academy One', email: 'one@student-academy.test', ownerId: owner._id, status: 'ACTIVE' },
    { name: 'Student Academy Two', email: 'two@student-academy.test', ownerId: secondOwner._id, status: 'ACTIVE' },
  ]);
  const plan = await Subscription.create({ organizationId: organization._id, planName: 'Learning', price: 99, billingCycle: 'MONTHLY', status: 'ACTIVE' });
  const student = await Subscriber.create({
    organizationId: organization._id, subscriptionId: plan._id, fullName: 'Alex Student', email: 'alex@student.test',
    status: 'ACTIVE', registrationStatus: 'APPROVED', passwordHash: await bcrypt.hash('StudentPassword123!', 4),
  });
  const otherStudent = await Subscriber.create({
    organizationId: secondOrganization._id, fullName: 'Taylor Student', email: 'taylor@student.test',
    status: 'ACTIVE', registrationStatus: 'APPROVED', passwordHash: await bcrypt.hash('StudentPassword123!', 4),
  });
  const ownInvoice = await Billing.create({
    organizationId: organization._id, subscriberId: student._id, subscriptionId: plan._id,
    invoiceNumber: 'INV-STUDENT-OWN', paymentName: 'Learning plan', dueDate: new Date(), amount: 99,
  });
  const foreignInvoice = await Billing.create({
    organizationId: secondOrganization._id, subscriberId: otherStudent._id,
    invoiceNumber: 'INV-STUDENT-FOREIGN', paymentName: 'Foreign plan', dueDate: new Date(), amount: 500,
  });
  const ownCourse = await Course.create({ organizationId: organization._id, courseCode: 'OWN-1', courseName: 'Own course', status: 'PUBLISHED' });
  const foreignCourse = await Course.create({ organizationId: secondOrganization._id, courseCode: 'FOREIGN-1', courseName: 'Foreign course', status: 'PUBLISHED' });
  return { student, otherStudent, ownInvoice, foreignInvoice, ownCourse, foreignCourse };
}

async function csrf(agent) {
  const response = await agent.get('/api/student/auth/csrf');
  expect(response.status).toBe(200);
  return response.body.data.token;
}

async function login() {
  const data = await setup();
  const agent = request.agent(server);
  const token = await csrf(agent);
  const response = await agent.post('/api/student/auth/login').set('X-CSRF-TOKEN', token).send({ email: data.student.email, password: 'StudentPassword123!' });
  expect(response.status).toBe(200);
  return { ...data, agent, csrfToken: response.body.data.csrfToken };
}

test('public registration requires an active organization and remains pending until approved', async () => {
  await setup();
  const agent = request.agent(server);
  const token = await csrf(agent);
  const organizations = await agent.get('/api/student/registration/organizations');
  expect(organizations.status).toBe(200);
  expect(organizations.body.data).toEqual([
    { id: String(organization._id), name: organization.name },
    { id: String(secondOrganization._id), name: secondOrganization.name },
  ]);
  const registration = await agent.post('/api/student/registration').set('X-CSRF-TOKEN', token).send({
    organizationId: String(organization._id), fullName: 'New Learner', email: 'new@student.test', phone: '555-0101',
  });
  expect(registration.status).toBe(201);
  expect(registration.body.data.status).toBe('PENDING');
  const stored = await Subscriber.findById(registration.body.data.id);
  expect(stored.status).toBe('PENDING');
  expect(stored.registrationStatus).toBe('PENDING');
  const loginResponse = await agent.post('/api/student/auth/login').set('X-CSRF-TOKEN', token).send({ email: stored.email, password: 'SomePassword123!' });
  expect(loginResponse.status).toBe(401);
});

test('set-password tokens are hashed, one-time, and expire', async () => {
  const { student } = await setup();
  const token = 'an-invitation-token-that-is-long-enough-to-use';
  student.setPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  student.setPasswordTokenExpiresAt = new Date(Date.now() + 60_000);
  await student.save();
  const agent = request.agent(server);
  const csrfToken = await csrf(agent);
  const saved = await agent.post('/api/student/auth/set-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'A-Better-Student-Password123!' });
  expect(saved.status).toBe(200);
  expect(saved.body.data.passwordHash).toBeUndefined();
  const stored = await Subscriber.findById(student._id).select('+passwordHash +setPasswordTokenHash');
  expect(stored.setPasswordTokenHash).toBeNull();
  expect(stored.passwordHash).not.toBe('A-Better-Student-Password123!');
  expect((await agent.post('/api/student/auth/set-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'Another-Student-Password123!' })).status).toBe(400);

  stored.setPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  stored.setPasswordTokenExpiresAt = new Date(Date.now() - 1_000);
  await stored.save();
  expect((await agent.post('/api/student/auth/reset-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'A-New-Student-Password123!' })).status).toBe(400);
});

test('student reads and writes stay scoped to the session student and organization', async () => {
  const { agent, csrfToken, ownInvoice, foreignInvoice, ownCourse, foreignCourse, otherStudent } = await login();
  const own = await agent.get('/api/student/invoices').query({ subscriberId: String(otherStudent._id) });
  expect(own.status).toBe(200);
  expect(own.body.data.map((row) => row.id)).toEqual([String(ownInvoice._id)]);
  expect((await agent.get(`/api/student/invoices/${foreignInvoice._id}`)).status).toBe(404);
  expect((await agent.post(`/api/student/invoices/${foreignInvoice._id}/pay`).set('X-CSRF-TOKEN', csrfToken).set('Idempotency-Key', 'cross-tenant-attempt-01').send({})).status).toBe(404);
  expect((await agent.get(`/api/student/courses/${foreignCourse._id}`)).status).toBe(404);
  const courses = await agent.get('/api/student/courses');
  expect(courses.body.data.map((row) => row.id)).toEqual([String(ownCourse._id)]);
  expect(courses.body.data[0].locked).toBe(false);
  expect((await agent.get(`/api/student/courses/${ownCourse._id}`)).status).toBe(200);
});

test('sandbox invoice payments are transactional and idempotent', async () => {
  const { agent, csrfToken, ownInvoice } = await login();
  const pay = () => agent.post(`/api/student/invoices/${ownInvoice._id}/pay`).set('X-CSRF-TOKEN', csrfToken).set('Idempotency-Key', 'invoice-payment-once-0001').send({});
  const first = await pay();
  const repeated = await pay();
  expect(first.status).toBe(200);
  expect(repeated.status).toBe(200);
  expect(repeated.body.data.id).toBe(first.body.data.id);
  expect(first.body.data.provider).toBe('SANDBOX');
  expect((await Billing.findById(ownInvoice._id)).paymentStatus).toBe('PAID');
  expect(await Payment.countDocuments({ billingId: ownInvoice._id })).toBe(1);
});

test('every authenticated request rechecks student, organization, and owner status', async () => {
  const { agent, student } = await login();
  await Organization.updateOne({ _id: organization._id }, { $set: { status: 'INACTIVE' } });
  expect((await agent.get('/api/student/dashboard')).status).toBe(401);
  await Organization.updateOne({ _id: organization._id }, { $set: { status: 'ACTIVE' } });
  const studentAgent = request.agent(server), token = await csrf(studentAgent);
  const result = await studentAgent.post('/api/student/auth/login').set('X-CSRF-TOKEN', token).send({ email: student.email, password: 'StudentPassword123!' });
  expect(result.status).toBe(200);
  await BusinessOwner.updateOne({ _id: owner._id }, { $set: { status: 'INACTIVE' } });
  expect((await studentAgent.get('/api/student/dashboard')).status).toBe(401);
});
