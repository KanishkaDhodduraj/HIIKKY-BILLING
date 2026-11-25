import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
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
import AuditLog from '../src/models/AuditLog.js';
import { env } from '../src/config/env.js';

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
  for (const Model of [BusinessOwner, Organization, Subscriber, Subscription, Course, StudentCourse, Payment, BillingNotification, AuditLog]) await Model.deleteMany({});
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
  expect((await agent.post(`/api/owner/students/${foreign._id}/resend-invite`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(404);
  expect((await agent.post(`/api/owner/students/${foreign._id}/reset-password`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(404);
  expect((await agent.delete(`/api/owner/students/${foreign._id}`).set('X-CSRF-TOKEN', csrfToken)).status).toBe(404);
  const rejected = await Subscriber.create({ organizationId: organization._id, fullName: 'Reject Student', email: 'reject@student.test', status: 'PENDING', registrationStatus: 'PENDING' });
  expect((await agent.patch(`/api/owner/students/${rejected._id}/reject`).set('X-CSRF-TOKEN', csrfToken).send({ reason: 'Incomplete application' })).status).toBe(200);
  expect((await Subscriber.findById(rejected._id)).registrationReviewReason).toBe('Incomplete application');
  expect((await agent.patch(`/api/owner/students/${own._id}/reject`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(400);
});

test('owner student creation supports invitation toggle and never returns the temporary password', async () => {
  await setup();
  const originalOutbox = env.ownerStudentOutboxPath;
  const outboxPath = '.student-invite-flow-test-outbox.jsonl';
  env.ownerStudentOutboxPath = outboxPath;
  const originalInfo = console.info;
  console.info = jest.fn();
  try {
    const invited = await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({
      name: 'New Student', email: 'new-student@student.test', phone: '555-0101', sendInvite: true,
    });
    expect(invited.status).toBe(201);
    expect(invited.body.data.inviteStatus).toBe('INVITED');
    expect(invited.body.data.mustChangePassword).toBe(true);
    const outbox = (await readFile(path.resolve(outboxPath), 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    const temporaryPassword = outbox[0].text.match(/Temporary password: ([^\s]+)/)?.[1];
    expect(temporaryPassword).toMatch(/^(?=.*[A-HJ-NP-Z])(?=.*[a-km-z])(?=.*[2-9])(?=.*[!@#$%&*?])[A-HJ-NP-Za-km-z2-9!@#$%&*?]{12}$/);
    expect(JSON.stringify(invited.body)).not.toContain(temporaryPassword);
    expect(outbox[0].text).toContain(organization.name);
    expect(outbox[0].text).toContain('72');
    const stored = await Subscriber.findById(invited.body.data.id).select('+passwordHash');
    expect(stored.passwordHash).not.toContain(temporaryPassword);
    expect(bcrypt.getRounds(stored.passwordHash)).toBeGreaterThanOrEqual(12);
    expect(await bcrypt.compare(temporaryPassword, stored.passwordHash)).toBe(true);

    const noInvite = await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({
      name: 'No Invite Student', email: 'no-invite@student.test', sendInvite: false,
    });
    expect(noInvite.status).toBe(201);
    expect(noInvite.body.data.inviteStatus).toBe('not_invited');
    expect((await Subscriber.findById(noInvite.body.data.id).select('+passwordHash')).passwordHash).toBeNull();
    expect((await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({ name: 'Duplicate', email: 'new-student@student.test' })).status).toBe(409);
  } finally {
    console.info = originalInfo;
    env.ownerStudentOutboxPath = originalOutbox;
    await rm(path.resolve(outboxPath), { force: true });
  }
});

test('owner keeps a student and marks INVITE_FAILED when email delivery fails', async () => {
  await setup();
  const previous = { nodeEnv: env.nodeEnv, smtpHost: env.smtpHost };
  env.nodeEnv = 'production';
  env.smtpHost = undefined;
  try {
    const response = await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({
      name: 'Mail Failure Student', email: 'mail-failure@student.test',
    });
    expect(response.status).toBe(502);
    expect(response.body.message).toMatch(/invitation email could not be sent/i);
    expect(response.body.data.inviteStatus).toBe('INVITE_FAILED');
    expect(JSON.stringify(response.body)).not.toMatch(/Temporary password:/i);
    expect(Boolean(await Subscriber.exists({ email: 'mail-failure@student.test' }))).toBe(true);
  } finally {
    env.nodeEnv = previous.nodeEnv;
    env.smtpHost = previous.smtpHost;
  }
});

test('resending replaces the temporary password and enforces five sends per rolling day', async () => {
  await setup();
  const originalOutbox = env.ownerStudentOutboxPath;
  const outboxPath = '.student-resend-flow-test-outbox.jsonl';
  env.ownerStudentOutboxPath = outboxPath;
  const originalInfo = console.info;
  console.info = jest.fn();
  try {
    const created = await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({ name: 'Resend Student', email: 'resend@student.test' });
    const firstEmail = JSON.parse((await readFile(path.resolve(outboxPath), 'utf8')).trim().split(/\r?\n/)[0]);
    const oldPassword = firstEmail.text.match(/Temporary password: ([^\s]+)/)[1];
    const resent = await agent.post(`/api/owner/students/${created.body.data.id}/resend-invite`).set('X-CSRF-TOKEN', csrfToken).send({});
    expect(resent.status).toBe(200);
    const emails = (await readFile(path.resolve(outboxPath), 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line));
    const newPassword = emails[1].text.match(/Temporary password: ([^\s]+)/)[1];
    expect(newPassword).not.toBe(oldPassword);
    expect(JSON.stringify(resent.body)).not.toContain(newPassword);
    const stored = await Subscriber.findById(created.body.data.id).select('+passwordHash');
    expect(await bcrypt.compare(oldPassword, stored.passwordHash)).toBe(false);
    expect(await bcrypt.compare(newPassword, stored.passwordHash)).toBe(true);

    for (let send = 0; send < 3; send += 1) {
      expect((await agent.post(`/api/owner/students/${created.body.data.id}/resend-invite`).set('X-CSRF-TOKEN', csrfToken).send({})).status).toBe(200);
    }
    const limited = await agent.post(`/api/owner/students/${created.body.data.id}/resend-invite`).set('X-CSRF-TOKEN', csrfToken).send({});
    expect(limited.status).toBe(429);
    expect((await Subscriber.findById(created.body.data.id)).inviteCount).toBe(5);
  } finally {
    console.info = originalInfo;
    env.ownerStudentOutboxPath = originalOutbox;
    await rm(path.resolve(outboxPath), { force: true });
  }
});

test('CSV import reports created, duplicate, and invalid rows', async () => {
  await setup();
  const originalOutbox = env.ownerStudentOutboxPath;
  const outboxPath = '.student-csv-flow-test-outbox.jsonl';
  env.ownerStudentOutboxPath = outboxPath;
  const originalInfo = console.info;
  console.info = jest.fn();
  try {
    const response = await agent.post('/api/owner/students/bulk')
      .set('X-CSRF-TOKEN', csrfToken)
      .set('Content-Type', 'text/csv')
      .send('name,email\nCSV Student,csv@student.test\nCSV Duplicate,csv@student.test\nInvalid Row,not-an-email');
    expect(response.status).toBe(200);
    expect(response.body.data.results.map((row) => row.status)).toEqual(['created', 'duplicate', 'invalid']);
    expect(response.body.data.total).toBe(3);
    const oversizedCsv = `name,email\n${Array.from({ length: 501 }, (_, index) => `Student ${index},student-${index}@student.test`).join('\n')}`;
    expect((await agent.post('/api/owner/students/bulk').set('X-CSRF-TOKEN', csrfToken).set('Content-Type', 'text/csv').send(oversizedCsv)).status).toBe(413);
    const previousNodeEnv = env.nodeEnv;
    const previousSmtpHost = env.smtpHost;
    env.nodeEnv = 'production';
    env.smtpHost = undefined;
    try {
      const failedMail = await agent.post('/api/owner/students/bulk').set('X-CSRF-TOKEN', csrfToken).set('Content-Type', 'text/csv').send('name,email\nMail Failure,csv-mail-failure@student.test');
      expect(failedMail.body.data.results[0].status).toBe('email_failed');
      expect(failedMail.body.data.results[0].inviteStatus).toBe('INVITE_FAILED');
    } finally {
      env.nodeEnv = previousNodeEnv;
      env.smtpHost = previousSmtpHost;
    }
  } finally {
    console.info = originalInfo;
    env.ownerStudentOutboxPath = originalOutbox;
    await rm(path.resolve(outboxPath), { force: true });
  }
});

test('active student password reset forces a new temporary password and audits the owner action', async () => {
  await setup();
  const originalOutbox = env.ownerStudentOutboxPath;
  const outboxPath = '.student-reset-flow-test-outbox.jsonl';
  env.ownerStudentOutboxPath = outboxPath;
  const originalInfo = console.info;
  console.info = jest.fn();
  try {
    const created = await agent.post('/api/owner/students').set('X-CSRF-TOKEN', csrfToken).send({ name: 'Reset Student', email: 'reset@student.test' });
    const student = await Subscriber.findById(created.body.data.id).select('+passwordHash');
    student.passwordHash = await bcrypt.hash('Previously-Active-Password!', 12);
    student.passwordSetAt = new Date();
    student.passwordChangedAt = new Date();
    student.mustChangePassword = false;
    student.tempPasswordExpiresAt = null;
    student.inviteStatus = 'ACTIVE';
    await student.save();

    const reset = await agent.post(`/api/owner/students/${student._id}/reset-password`).set('X-CSRF-TOKEN', csrfToken).send({});
    expect(reset.status).toBe(200);
    expect(reset.body.data.inviteStatus).toBe('INVITED');
    expect(reset.body.data.mustChangePassword).toBe(true);
    expect(JSON.stringify(reset.body)).not.toContain('Temporary password:');
    expect(await AuditLog.exists({ studentId: student._id, action: 'student.password.reset_by_owner', actorId: owner._id })).toBeTruthy();
  } finally {
    console.info = originalInfo;
    env.ownerStudentOutboxPath = originalOutbox;
    await rm(path.resolve(outboxPath), { force: true });
  }
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
