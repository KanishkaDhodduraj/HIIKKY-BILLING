import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';

let repl;
let app;
let server;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  app = createApp();
  server = app.listen(0);
}, 120000);
afterEach(async () => { await BusinessOwner.deleteMany({}); await Organization.deleteMany({}); });
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
