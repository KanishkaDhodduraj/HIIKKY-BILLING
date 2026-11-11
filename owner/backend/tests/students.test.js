import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import Subscriber from '../src/models/Subscriber.js';
import Subscription from '../src/models/Subscription.js';
import Course from '../src/models/Course.js';
import StudentCourse from '../src/models/StudentCourse.js';
import Payment from '../src/models/Payment.js';
import BillingNotification from '../src/models/BillingNotification.js';

let repl;
let server;
let owner;
let organization;
let csrfToken;
let agent;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  server = createApp().listen(0);
}, 120000);

afterEach(async () => {
  for (const Model of [BusinessOwner, Organization, Subscriber, Subscription, Course, StudentCourse, Payment, BillingNotification]) await Model.deleteMany({});
  await mongoose.connection.collection('student_sessions').deleteMany({});
});

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await repl?.stop();
});

async function setup() {
  owner = await BusinessOwner.create({ firstName: 'Owner', email: 'owner@students.test', passwordHash: await bcrypt.hash('OwnerPassword123!', 4), passwordSetAt: new Date() });
  organization = await Organization.create({ name: 'Owner Academy', email: 'office@owner-academy.test', ownerId: owner._id });
  agent = request.agent(server);
  const csrf = await agent.get('/api/owner/auth/csrf');
  const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrf.body.data.token).send({ email: owner.email, password: 'OwnerPassword123!' });
  expect(login.status).toBe(200);
  csrfToken = login.body.data.csrfToken;
}

test('owner can review pending registrations; approval issues hashed one-time invitation', async () => {
  await setup();
  const student = await Subscriber.create({ organizationId: organization._id, fullName: 'Pending Student', email: 'pending@student.test', status: 'PENDING', registrationStatus: 'PENDING' });
  const originalInfo = console.info;
  console.info = jest.fn();
  try {
    const pending = await agent.get('/api/owner/students/registrations');
    expect(pending.status).toBe(200);
    expect(pending.body.data.map((row) => row.id)).toContain(String(student._id));
    const approved = await agent.patch(`/api/owner/students/${student._id}/approve`).set('X-CSRF-TOKEN', csrfToken).send({});
    expect(approved.status).toBe(200);
    expect(approved.body.data.registrationStatus).toBe('APPROVED');
    expect(approved.body.data.inviteStatus).toBe('invited');
    expect(approved.body.data.setPasswordTokenHash).toBeUndefined();
    const stored = await Subscriber.findById(student._id).select('+setPasswordTokenHash');
    expect(stored.setPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.setPasswordTokenHash).not.toContain('pending@student.test');
    expect(stored.setPasswordTokenExpiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
  } finally { console.info = originalInfo; }
});

test('owner rejection requires a reason and student CRUD stays tenant scoped', async () => {
  await setup();
  const [own, foreignOwner] = await Promise.all([
    Subscriber.create({ organizationId: organization._id, fullName: 'Own Student', email: 'own@student.test' }),
    BusinessOwner.create({ firstName: 'Other', email: 'other-owner@students.test' }),
  ]);
  const foreignOrganization = await Organization.create({ name: 'Foreign Academy', email: 'foreign-academy@students.test', ownerId: foreignOwner._id });
  const foreign = await Subscriber.create({ organizationId: foreignOrganization._id, fullName: 'Foreign Student', email: 'foreign@student.test' });
  expect((await agent.patch(`/api/owner/students/${foreign._id}/status`).set('X-CSRF-TOKEN', csrfToken).send({ status: 'INACTIVE' })).status).toBe(404);
  expect((await agent.delete(`/api/owner/students/${foreign._id}`).set('X-CSRF-TOKEN', csrfToken)).status).toBe(404);
  const rejected = await Subscriber.create({ organizationId: organization._id, fullName: 'Reject Student', email: 'reject@student.test', status: 'PENDING', registrationStatus: 'PENDING' });
  expect((await agent.patch(`/api/owner/students/${rejected._id}/reject`).set('X-CSRF-TOKEN', csrfToken).send({ reason: 'Incomplete application' })).status).toBe(200);
  expect((await Subscriber.findById(rejected._id)).registrationReviewReason).toBe('Incomplete application');
  expect((await agent.patch(`/api/owner/students/${own._id}/reject`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(400);
});

test('owner assigns published courses and student-specific notifications', async () => {
  await setup();
  const student = await Subscriber.create({ organizationId: organization._id, fullName: 'Learner', email: 'learner@student.test' });
  const course = await Course.create({ organizationId: organization._id, courseCode: 'JS-01', courseName: 'JavaScript', status: 'PUBLISHED' });
  const assigned = await agent.put(`/api/owner/students/${student._id}/courses`).set('X-CSRF-TOKEN', csrfToken).send({ courseIds: [String(course._id)] });
  expect(assigned.status).toBe(200);
  expect(assigned.body.data.assigned).toBe(1);
  expect((await agent.get(`/api/owner/students/${student._id}/courses`)).body.data[0].id).toBe(String(course._id));
  const notification = await agent.post(`/api/owner/students/${student._id}/notifications`).set('X-CSRF-TOKEN', csrfToken).send({ subject: 'New module', message: 'A new course module is available.' });
  expect(notification.status).toBe(201);
  expect((await BillingNotification.findById(notification.body.data.id)).subscriberId.toString()).toBe(String(student._id));
});

test('student deactivation removes matching sessions without deleting other tenant sessions', async () => {
  await setup();
  const student = await Subscriber.create({ organizationId: organization._id, fullName: 'Session Student', email: 'session@student.test' });
  const other = await Subscriber.create({ organizationId: organization._id, fullName: 'Other Student', email: 'other@student.test' });
  const sessions = mongoose.connection.collection('student_sessions');
  await sessions.insertMany([
    { _id: 'student-session-a', session: JSON.stringify({ cookie: {}, student: { id: String(student._id), organizationId: String(organization._id) } }), expires: new Date(Date.now() + 60_000) },
    { _id: 'student-session-b', session: JSON.stringify({ cookie: {}, student: { id: String(other._id), organizationId: String(organization._id) } }), expires: new Date(Date.now() + 60_000) },
  ]);
  const response = await agent.patch(`/api/owner/students/${student._id}/status`).set('X-CSRF-TOKEN', csrfToken).send({ status: 'INACTIVE' });
  expect(response.status).toBe(200);
  expect(await sessions.countDocuments({})).toBe(1);
  expect((await sessions.findOne({ _id: 'student-session-b' }))._id).toBe('student-session-b');
});
