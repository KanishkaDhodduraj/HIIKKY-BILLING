import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import OwnerSetting from '../src/models/OwnerSetting.js';

let repl;
let server;
let agent;
let csrfToken;
let owner;
let organization;
beforeAll(async () => {
  env.settingsEncryptionKey = 'test-owner-settings-encryption-key-0001';
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  server = createApp().listen(0);
}, 120000);
beforeEach(async () => {
  owner = await BusinessOwner.create({ firstName: 'Settings', email: 'settings@owner.test', passwordHash: await bcrypt.hash('StrongPassword123', 4), passwordSetAt: new Date() });
  organization = await Organization.create({ name: 'Settings Academy', email: 'hello@settings.test', ownerId: owner._id });
  agent = request.agent(server);
  const csrf = await agent.get('/api/owner/auth/csrf');
  const login = await agent.post('/api/owner/auth/login').set('X-CSRF-TOKEN', csrf.body.data.token).send({ email: owner.email, password: 'StrongPassword123' });
  csrfToken = login.body.data.csrfToken;
});
afterEach(async () => { await BusinessOwner.deleteMany({}); await Organization.deleteMany({}); await OwnerSetting.deleteMany({}); });
afterAll(async () => { await new Promise((resolve) => server?.close(resolve)); await mongoose.disconnect(); await repl?.stop(); });

test('settings save an organization profile, encrypt provider and SMTP secrets, and rotate a one-time API key', async () => {
  const profile = await agent.put('/api/owner/settings/profile').set('X-CSRF-TOKEN', csrfToken).send({ name: 'Updated Academy', phone: '+1 555 0140', industry: 'Education' });
  expect(profile.status).toBe(200);
  expect(profile.body.data.name).toBe('Updated Academy');
  const gateway = await agent.put('/api/owner/settings/gateways/stripe').set('X-CSRF-TOKEN', csrfToken).send({ enabled: true, publicKey: 'pk_test_public', apiKey: 'sk_test_secret' });
  expect(gateway.status).toBe(200);
  expect(JSON.stringify(gateway.body)).not.toContain('sk_test_secret');
  expect((await agent.post('/api/owner/settings/gateways/stripe/test').set('X-CSRF-TOKEN', csrfToken).send({})).body.data.verified).toBe(false);
  const mail = await agent.put('/api/owner/settings/email').set('X-CSRF-TOKEN', csrfToken).send({ smtpHost: 'smtp.example.test', port: 587, encryption: 'TLS', username: 'owner', password: 'smtp-password', fromName: 'Settings Academy', replyTo: 'hello@settings.test' });
  expect(mail.status).toBe(200);
  expect(JSON.stringify(mail.body)).not.toContain('smtp-password');
  const emailTest = await agent.post('/api/owner/settings/email/test').set('X-CSRF-TOKEN', csrfToken).send({});
  expect(emailTest.status).toBe(200);
  expect(emailTest.body.data.sent).toBe(false);
  const rotated = await agent.post('/api/owner/settings/security/master-key').set('X-CSRF-TOKEN', csrfToken).send({});
  expect(rotated.status).toBe(200);
  expect(rotated.body.data.apiKey).toMatch(/^hk_live_/);
  const settings = await agent.get('/api/owner/settings');
  expect(settings.status).toBe(200);
  expect(JSON.stringify(settings.body)).not.toContain(rotated.body.data.apiKey);
  const stored = await OwnerSetting.findOne({ organizationId: organization._id }).select('+gateways.apiKeyCiphertext +emailSettings.passwordCiphertext +security.masterApiKeyHash');
  expect(stored.gateways[0].apiKeyCiphertext).toBeTruthy();
  expect(settings.body.data.settings.gateways[0].hasCredentials).toBe(true);
  expect(stored.gateways[0].apiKeyCiphertext).not.toContain('sk_test_secret');
  expect(stored.emailSettings.passwordCiphertext).not.toContain('smtp-password');
  expect(stored.security.masterApiKeyHash).not.toContain(rotated.body.data.apiKey);
});

test('IP allow-list can only be enabled when it contains the current request address', async () => {
  const blocked = await agent.put('/api/owner/settings/security').set('X-CSRF-TOKEN', csrfToken).send({ ipWhitelistEnabled: true, allowedIPs: ['203.0.113.99'] });
  expect(blocked.status).toBe(400);
  const allowed = await agent.put('/api/owner/settings/security').set('X-CSRF-TOKEN', csrfToken).send({ ipWhitelistEnabled: true, allowedIPs: ['::ffff:127.0.0.1'] });
  expect(allowed.status).toBe(200);
});
