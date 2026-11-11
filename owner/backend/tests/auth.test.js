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
import BusinessRequest from '../src/models/BusinessRequest.js';
import OwnerSetting from '../src/models/OwnerSetting.js';
import { mailService } from '../src/modules/auth/mail.service.js';

let repl;
let app;
let server;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  app = createApp();
  server = app.listen(0);
}, 120000);
afterEach(async () => { await BusinessOwner.deleteMany({}); await Organization.deleteMany({}); await Subscriber.deleteMany({}); await BusinessRequest.deleteMany({}); await OwnerSetting.deleteMany({}); });
afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); await mongoose.disconnect(); await repl?.stop(); });

async function csrf(agent) {
  const response = await agent.get('/api/owner/auth/csrf');
  expect(response.status).toBe(200);
  return response.body.data.token;
}

test('owner login rotates the session, returns no credential fields, and active owners can read profile', async () => {
  const owner = await BusinessOwner.create({ firstName: 'Ava', email: 'ava@owner.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() });
  await Organization.create({ name: 'Ava Learning', email: 'office@ava.test', ownerId: owner._id });
  const agent = request.agent(server);
  const csrfToken = await csrf(agent);
  const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrfToken).send({ email: owner.email, password: 'StrongPassword123' });
  expect(login.status).toBe(200);
  expect(login.body.data.email).toBe(owner.email);
  expect(login.body.data.passwordHash).toBeUndefined();
  expect(login.body.data.csrfToken).toBeTruthy();
  const profile = await agent.get('/api/owner/profile');
  expect(profile.status).toBe(200);
  expect(profile.body.data.email).toBe(owner.email);
});

test('inactive owners and owners without a set password cannot log in', async () => {
  await BusinessOwner.create([
    { firstName: 'Inactive', email: 'inactive@owner.test', status: 'INACTIVE', passwordHash: await bcrypt.hash('StrongPassword123', 4) },
    { firstName: 'Invited', email: 'invited@owner.test' },
  ]);
  const agent = request.agent(server);
  const token = await csrf(agent);
  expect((await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', token).send({ email: 'inactive@owner.test', password: 'StrongPassword123' })).status).toBe(401);
  expect((await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', token).send({ email: 'invited@owner.test', password: 'StrongPassword123' })).status).toBe(401);
});

test('hashed set-password links are one use and expire after setting a password', async () => {
  const owner = await BusinessOwner.create({ firstName: 'Mira', email: 'mira@owner.test' });
  const token = 'a-very-long-random-password-setup-token-value-123456';
  owner.setPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  owner.setPasswordTokenExpiresAt = new Date(Date.now() + 60_000);
  await owner.save();
  const agent = request.agent(server);
  const csrfToken = await csrf(agent);
  const saved = await agent.post('/api/owner/auth/set-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'A-Strong-Owner-Password-123' });
  expect(saved.status).toBe(200);
  expect(saved.body.data.passwordHash).toBeUndefined();
  expect((await BusinessOwner.findById(owner._id).select('+passwordHash +setPasswordTokenHash')).setPasswordTokenHash).toBeNull();
  expect((await agent.post('/api/owner/auth/set-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'Another-Strong-Password-123' })).status).toBe(400);
});

test('expired set-password links are rejected', async () => {
  const owner = await BusinessOwner.create({ firstName: 'Expired', email: 'expired@owner.test' });
  const token = 'an-expired-password-setup-token-value-123456789';
  owner.setPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  owner.setPasswordTokenExpiresAt = new Date(Date.now() - 1000);
  await owner.save();
  const agent = request.agent(server), csrfToken = await csrf(agent);
  const response = await agent.post('/api/owner/auth/set-password').set('X-CSRF-TOKEN', csrfToken).send({ token, password: 'A-Strong-Owner-Password-123' });
  expect(response.status).toBe(400);
  expect(response.body.message).toMatch(/invalid or expired/i);
  expect((await BusinessOwner.findById(owner._id).select('+passwordHash')).passwordHash).toBeNull();
});

test('tenant scope comes from the login session; foreign records return 404 and cannot be reassigned', async () => {
  const [ownerA, ownerB] = await BusinessOwner.create([
    { firstName: 'Owner A', email: 'a@owner.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() },
    { firstName: 'Owner B', email: 'b@owner.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() },
  ]);
  const [orgA, orgB] = await Organization.create([
    { name: 'Tenant A', email: 'a@tenant.test', ownerId: ownerA._id },
    { name: 'Tenant B', email: 'b@tenant.test', ownerId: ownerB._id },
  ]);
  const [ownSubscriber, foreignSubscriber] = await Subscriber.create([
    { organizationId: orgA._id, fullName: 'Own Student', email: 'own@student.test' },
    { organizationId: orgB._id, fullName: 'Foreign Student', email: 'foreign@student.test' },
  ]);
  const agent = request.agent(server);
  const csrfToken = await csrf(agent);
  const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrfToken).send({ email: ownerA.email, password: 'StrongPassword123' });
  const ownList = await agent.get('/api/owner/subscribers').query({ organizationId: String(orgB._id), search: 'Student' });
  expect(ownList.status).toBe(200);
  expect(ownList.body.data.map((row) => row.id)).toEqual([String(ownSubscriber._id)]);
  expect((await agent.get(`/api/owner/subscribers/${foreignSubscriber._id}`)).status).toBe(404);
  const create = await agent.post('/api/owner/subscribers').set('X-CSRF-TOKEN', login.body.data.csrfToken).send({ organizationId: String(orgB._id), fullName: 'New Student', email: 'new@student.test' });
  expect(create.status).toBe(201);
  expect(create.body.data.organizationId).toBe(String(orgA._id));
  expect((await agent.put(`/api/owner/subscribers/${foreignSubscriber._id}`).set('X-CSRF-TOKEN', login.body.data.csrfToken).send({ fullName: 'Hijacked' })).status).toBe(404);
  expect((await agent.delete(`/api/owner/subscribers/${foreignSubscriber._id}`).set('X-CSRF-TOKEN', login.body.data.csrfToken)).status).toBe(404);
});

test('public owner registration stores the details and allows a minimal status lookup', async () => {
  const agent = request.agent(server);
  const csrfToken = await csrf(agent);
  const registration = await agent.post('/api/owner/registrations').set('X-CSRF-TOKEN', csrfToken).send({ firstName: 'Leah', lastName: 'Kim', ownerEmail: 'leah@academy.test', organizationName: 'Leah Academy', organizationEmail: 'contact@leah.test', industry: 'E-Learning', projectedStudentCount: 500, operatingRegion: 'North America', subscriptionTier: 'Starter', documentsSkipped: true, termsAccepted: true });
  expect(registration.status).toBe(201);
  const stored = await BusinessRequest.findById(registration.body.data.id);
  expect(stored.status).toBe('PENDING');
  expect(stored.documentsSkipped).toBe(true);
  expect(stored.termsAcceptedAt).toBeTruthy();
  const status = await agent.get(`/api/owner/registrations/${registration.body.data.id}`);
  expect(status.status).toBe(200);
  expect(status.body.data).toMatchObject({ id: registration.body.data.id, status: 'PENDING', ownerCreated: false });
  expect(status.body.data.ownerEmail).toBeUndefined();
});

test('two-factor login requires a one-time email code before granting owner access', async () => {
  const owner = await BusinessOwner.create({ firstName: 'Two Factor', email: '2fa@owner.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() });
  const organization = await Organization.create({ name: 'Two Factor School', email: '2fa@school.test', ownerId: owner._id });
  await OwnerSetting.create({ organizationId: organization._id, security: { twoFactorEnabled: true } });
  let sentCode;
  const mail = jest.spyOn(mailService, 'sendLoginCode').mockImplementation(async ({ code }) => { sentCode = code; });
  try {
    const agent = request.agent(server);
    const csrfToken = await csrf(agent);
    const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrfToken).send({ email: owner.email, password: 'StrongPassword123' });
    expect(login.status).toBe(200);
    expect(login.body.data.requiresOtp).toBe(true);
    expect((await agent.get('/api/owner/profile')).status).toBe(401);
    const verified = await agent.post('/api/owner/auth/verify-otp').set('X-CSRF-TOKEN', login.body.data.csrfToken).send({ code: sentCode });
    expect(verified.status).toBe(200);
    expect((await agent.get('/api/owner/profile')).status).toBe(200);
    expect((await agent.post('/api/owner/auth/verify-otp').set('X-CSRF-TOKEN', verified.body.data.csrfToken).send({ code: sentCode })).status).toBe(401);
  } finally { mail.mockRestore(); }
});
