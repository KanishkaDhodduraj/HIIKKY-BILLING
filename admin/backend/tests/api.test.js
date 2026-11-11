import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import fs from 'node:fs/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import AdminAccount from '../src/models/AdminAccount.js';
import BusinessRequest from '../src/models/BusinessRequest.js';
import BusinessOwner from '../src/models/BusinessOwner.js';
import Organization from '../src/models/Organization.js';
import { requestsService } from '../src/modules/businessRequests/businessRequests.service.js';
import { env } from '../src/config/env.js';
import PlatformPlan from '../src/models/PlatformPlan.js';
import PaymentGateway from '../src/models/PaymentGateway.js';
import Notification from '../src/models/Notification.js';
import AdminSetting from '../src/models/AdminSetting.js';
import { ownerMailService } from '../src/modules/owners/mail.service.js';
import { privateDocumentPath } from '../src/modules/businessRequests/documentStorage.js';
import { resetIntakeAttempts } from '../src/modules/businessRequests/intakeLimiter.js';

let repl, app;
beforeAll(async () => { repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(repl.getUri()); app = createApp(); }, 120000);
afterEach(async () => { const requests = await BusinessRequest.find().select('+documents.storageKey'); for (const application of requests) for (const document of application.documents || []) if (document.storageKey) await fs.rm(privateDocumentPath(document.storageKey), { force: true }); for (const model of [AdminAccount, BusinessRequest, BusinessOwner, Organization, PlatformPlan, PaymentGateway, Notification, AdminSetting]) await model.deleteMany({}); await mongoose.connection.collection('owner_sessions').deleteMany({}); resetIntakeAttempts(); });
afterAll(async () => { await mongoose.disconnect(); await repl?.stop(); });

async function csrf(agent) { const r = await agent.get('/api/admin/auth/csrf'); if(!r.body.data?.token) throw new Error(`CSRF endpoint returned ${r.status}: ${JSON.stringify(r.body)}`); return r.body.data.token; }
async function loggedIn(role='SUPER_ADMIN') { const email=`${role.toLowerCase()}@example.com`,password='password123'; await AdminAccount.create({email,passwordHash:await bcrypt.hash(password,4),role});const agent=request.agent(app),token=await csrf(agent);const login=await agent.post('/api/admin/auth/login').set('X-CSRF-TOKEN',token).send({email,password});expect(login.status).toBe(200);return agent; }
describe('admin session and roles', () => {
  test('allows the owner portal origin to make credentialed intake requests', async () => {
    const response = await request(app).get('/api/admin/auth/csrf').set('Origin', env.ownerClientOrigin);
    expect(response.headers['access-control-allow-origin']).toBe(env.ownerClientOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-expose-headers']).toContain('X-Total-Count');
  });
  test('bootstraps exactly one first Super Admin using the one-time secret', async () => {
    env.bootstrapSecret='this-is-a-long-bootstrap-secret-for-tests';const agent=request.agent(app),token=await csrf(agent);
    const first=await agent.post('/api/admin/setup/first-super-admin').set('X-CSRF-TOKEN',token).set('X-Admin-Bootstrap-Secret',env.bootstrapSecret).send({email:'first@example.com',password:'StrongPassword123'});
    expect(first.status).toBe(201);expect(first.body.data.role).toBe('SUPER_ADMIN');expect(first.body.data.passwordHash).toBeUndefined();
    const next=await agent.post('/api/admin/setup/first-super-admin').set('X-CSRF-TOKEN',token).set('X-Admin-Bootstrap-Secret',env.bootstrapSecret).send({email:'second@example.com',password:'StrongPassword123'});
    expect(next.status).toBe(409);env.bootstrapSecret=undefined;
  });
  test('requires authentication for profile and account APIs', async () => {
    const agent = request.agent(app);
    expect((await agent.get('/api/admin/profile')).status).toBe(401);
    expect((await agent.get('/api/admin/accounts')).status).toBe(401);
  });
  test('logs in with a session cookie and role protects accounts', async () => {
    await AdminAccount.create({ email: 'admin@example.com', passwordHash: await bcrypt.hash('password123', 4), role: 'ADMIN' });
    const agent = request.agent(app); let token = await csrf(agent);
    const login = await agent.post('/api/admin/auth/login').set('X-CSRF-TOKEN', token).send({ email: 'admin@example.com', password: 'password123' });
    expect(login.status).toBe(200); token = await csrf(agent);
    expect((await agent.get('/api/admin/profile')).body.data.role).toBe('ADMIN');
    expect((await agent.get('/api/admin/accounts')).status).toBe(403);
  });
});

describe('search, pagination and request decision', () => {
  test('intake normalizes aliases, appears in Admin review, updates counts, and records a notification', async () => {
    const publicAgent = request.agent(app), token = await csrf(publicAgent);
    const response = await publicAgent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send({ firstName: '  Lina ', lastName: '  Park ', ownerEmail: 'LINA@EXAMPLE.TEST', organizationName: '  Park Academy ', organizationEmail: 'OFFICE@PARK.TEST', businessType: 'Professional Training', region: 'Asia Pacific', projectedStudentCount: 275, documentsSkipped: true });
    expect(response.status).toBe(201);
    const stored = await BusinessRequest.findById(response.body.data.id);
    expect(stored).toMatchObject({ firstName: 'Lina', lastName: 'Park', ownerEmail: 'lina@example.test', organizationName: 'Park Academy', organizationEmail: 'office@park.test', businessType: 'Professional Training', industry: 'Professional Training', region: 'Asia Pacific', operatingRegion: 'Asia Pacific' });
    expect(await Notification.findOne({ businessRequestId: stored._id })).toMatchObject({ notificationType: 'BUSINESS_REQUEST_SUBMITTED', recipientType: 'ADMIN' });
    const admin = await loggedIn();
    const list = await admin.get('/api/admin/business-requests').query({ status: 'PENDING' });
    expect(list.body.data[0]).toMatchObject({ id: String(stored._id), businessType: 'Professional Training', projectedStudentCount: 275, region: 'Asia Pacific' });
    const dashboard = await admin.get('/api/admin/dashboard').query({ page: 0, size: 5 });
    expect(dashboard.body.data.pendingBusinessRequests).toBe(1);
  });
  test('intake rejects invalid email and duplicate owner or organization details', async () => {
    const agent = request.agent(app), token = await csrf(agent), payload = { firstName: 'Nora', ownerEmail: 'nora@example.com', organizationName: 'Nora Academy', organizationEmail: 'hello@nora.test', businessType: 'Education', region: 'North America' };
    const invalid = await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send({ ...payload, ownerEmail: 'not-an-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.fieldErrors.ownerEmail).toBeTruthy();
    expect((await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send(payload)).status).toBe(201);
    const duplicate = await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send(payload);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toMatch(/application or account with this email or organization already exists/i);
  });
  test('private document uploads validate type and size and only Super Admins can download', async () => {
    const publicAgent = request.agent(app), token = await csrf(publicAgent), payload = { firstName: 'Mina', ownerEmail: 'mina@example.com', organizationName: 'Mina School', organizationEmail: 'hello@mina.test', businessType: 'Education', region: 'Europe', projectedStudentCount: 90 };
    const created = await publicAgent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).field(payload).attach('document', Buffer.from('%PDF-1.7\n%%EOF\n'), { filename: 'registration.pdf', contentType: 'application/pdf' });
    expect(created.status).toBe(201);
    const stored = await BusinessRequest.findById(created.body.data.id).select('+documents.storageKey');
    const document = stored.documents[0];
    expect(document.storageKey).toMatch(/^[0-9a-f-]+\.upload$/i);
    expect(await fs.readFile(privateDocumentPath(document.storageKey), 'utf8')).toContain('%PDF-');
    const status = await publicAgent.get(`/api/organization-registration-applications/${stored.id}/status`);
    expect(status.body.data).not.toHaveProperty('ownerEmail');
    expect((await publicAgent.get(`/api/admin/business-requests/${stored.id}/documents/${document.id}`)).status).toBe(401);
    const admin = await loggedIn();
    const detail = await admin.get(`/api/admin/business-requests/${stored.id}`);
    expect(detail.body.data.documents[0]).toMatchObject({ name: 'registration.pdf', mimeType: 'application/pdf', size: document.size });
    const download = await admin.get(`/api/admin/business-requests/${stored.id}/documents/${document.id}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toMatch(/application\/pdf/);
    const badType = await publicAgent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).field(payload).field('organizationName', 'Wrong Type Academy').attach('document', Buffer.from('not a pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(badType.status).toBe(400);
    expect(badType.body.fieldErrors.document).toBeTruthy();
    const tooLarge = await publicAgent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).field({ ...payload, organizationName: 'Large Document Academy' }).attach('document', Buffer.alloc(5 * 1024 * 1024 + 1, 0), { filename: 'large.pdf', contentType: 'application/pdf' });
    expect(tooLarge.status).toBe(413);
  });
  test('configured intake limit responds with 429 after the allowed submission', async () => {
    const agent = request.agent(app), token = await csrf(agent), payload = { firstName: 'Ari', ownerEmail: 'ari@example.com', organizationName: 'Ari Learning', organizationEmail: 'hello@ari.test' };
    await AdminSetting.create({ key: 'public-registration-rate-limit', maxSubmissions: 1 });
    expect((await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send(payload)).status).toBe(201);
    const limited = await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send({ ...payload, organizationName: 'Another Academy' });
    expect(limited.status).toBe(429);
    expect(limited.body.message).toMatch(/Too many registration submissions/);
  });
  test('rejected requests expose the reason to a reference lookup and create no owner', async () => {
    const publicAgent = request.agent(app), token = await csrf(publicAgent);
    const intake = await publicAgent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN', token).send({ firstName: 'Rae', ownerEmail: 'rae@example.com', organizationName: 'Rae College', organizationEmail: 'hello@rae.test' });
    const admin = await loggedIn(), adminToken = await csrf(admin);
    const rejected = await admin.patch(`/api/admin/business-requests/${intake.body.data.id}/reject`).set('X-CSRF-TOKEN', adminToken).send({ reason: 'Please provide proof of registration.' });
    expect(rejected.status).toBe(200);
    const status = await publicAgent.get(`/api/organization-registration-applications/${intake.body.data.id}/status`);
    expect(status.body.data).toMatchObject({ status: 'REJECTED', decisionReason: 'Please provide proof of registration.' });
    expect(status.body.data).not.toHaveProperty('ownerEmail');
    expect(await BusinessOwner.countDocuments()).toBe(0);
  });
  test('approval issues a hashed first-password invite and owner deactivation invalidates owner sessions',async()=>{
    env.sessionSecret='test-session-secret-with-at-least-32-characters';
    const previousNodeEnv = env.nodeEnv;
    env.nodeEnv = 'development';
    const mail=jest.spyOn(ownerMailService,'sendPasswordLink').mockResolvedValue();
    try{
      const agent=await loggedIn(),token=await csrf(agent);
      const application=await agent.post('/api/organization-registration-applications').set('X-CSRF-TOKEN',token).send({firstName:'Nora',ownerEmail:'nora@example.com',organizationName:'Nora Academy',organizationEmail:'hello@nora.test',industry:'Education',projectedStudentCount:500,operatingRegion:'North America',subscriptionTier:'Starter',documentsSkipped:true});
      expect(application.status).toBe(201);
      const approvalToken=await csrf(agent);
      const approval=await agent.patch(`/api/admin/business-requests/${application.body.data.id}/approve`).set('X-CSRF-TOKEN',approvalToken);
      expect(approval.status).toBe(200);
      expect(approval.body.data.passwordHash).toBeUndefined();
      expect(mail).toHaveBeenCalledTimes(1);
      const tokenFromMail=new URL(mail.mock.calls[0][0].url).searchParams.get('token');
      expect(approval.body.data.setPasswordUrl).toBe(mail.mock.calls[0][0].url);
      const owner=await BusinessOwner.findOne({email:'nora@example.com'}).select('+setPasswordTokenHash');
      expect(owner.setPasswordTokenHash).not.toBe(tokenFromMail);
      expect(new Date(owner.setPasswordTokenExpiresAt).getTime()-Date.now()).toBeGreaterThan(47*60*60*1000);
      expect(new Date(owner.setPasswordTokenExpiresAt).getTime()-Date.now()).toBeLessThanOrEqual(48*60*60*1000);
      expect(approval.body.data.industry).toBe('Education');
      const storedSession=JSON.stringify({owner:{id:String(owner._id),email:owner.email}});
      await mongoose.connection.collection('owner_sessions').insertOne({session:storedSession,expires:new Date(Date.now()+3600000)});
      const deactivateToken=await csrf(agent);
      const deactivated=await agent.patch(`/api/admin/business-owners/${owner.id}/deactivate`).set('X-CSRF-TOKEN',deactivateToken);
      expect(deactivated.status).toBe(200);
      expect(deactivated.body.data.inviteStatus).toBe('invited');
      expect(await mongoose.connection.collection('owner_sessions').countDocuments({})).toBe(0);
    } finally { mail.mockRestore(); env.nodeEnv = previousNodeEnv; }
  });
  test('Super Admin can create plans and gateway secrets are never returned in clear text',async()=>{env.sessionSecret='test-session-secret-with-at-least-32-characters';env.gatewayEncryptionKey='test-gateway-encryption-secret-with-32-chars';const agent=await loggedIn(),token=await csrf(agent);const p=await agent.post('/api/admin/plans').set('X-CSRF-TOKEN',token).send({planName:'Pro',description:'Team plan',price:25,billingCycle:'MONTHLY',maxUsers:100});expect(p.status).toBe(201);expect(p.body.data.planName).toBe('Pro');const g=await agent.put('/api/admin/gateways/STRIPE').set('X-CSRF-TOKEN',token).send({apiKey:'sk_test_private_secret',supportedMethods:['Cards']});expect(g.status).toBe(200);expect(JSON.stringify(g.body)).not.toContain('sk_test_private_secret');const stored=await PaymentGateway.findOne({provider:'STRIPE'}).select('+secretCiphertext');expect(stored.secretCiphertext).not.toContain('sk_test_private_secret');expect(stored.hasCredentials).toBe(true);expect(await PlatformPlan.countDocuments()).toBe(1);});
  test('account and organization management APIs enforce roles and support CRUD',async()=>{const agent=await loggedIn(),token=await csrf(agent);const account=await agent.post('/api/admin/accounts').set('X-CSRF-TOKEN',token).send({email:'new.admin@example.com',password:'password123',role:'ADMIN'});expect(account.status).toBe(201);const owner=await BusinessOwner.create({firstName:'Org',email:'org.owner@example.com'});const org=await agent.post('/api/admin/organizations').set('X-CSRF-TOKEN',token).send({name:'Org Test',email:'org@example.com',ownerId:String(owner._id)});expect(org.status).toBe(201);expect(org.body.data.ownerId).toBe(String(owner._id));const disabled=await agent.patch(`/api/admin/accounts/${account.body.data.id}/status`).set('X-CSRF-TOKEN',token).send({enabled:false});expect(disabled.status).toBe(200);expect(disabled.body.data.enabled).toBe(false);const removed=await agent.delete(`/api/admin/organizations/${org.body.data.id}`).set('X-CSRF-TOKEN',token);expect(removed.status).toBe(200);});
  test('dashboard and analytics aggregate current registration records',async()=>{const agent=await loggedIn();await BusinessOwner.create({firstName:'Ava',email:'ava.dashboard@example.com'});const dashboard=await agent.get('/api/admin/dashboard').query({page:0,size:10});expect(dashboard.status).toBe(200);expect(dashboard.body.data.businessOwners.total).toBe(1);expect(dashboard.body.data.recentActivity).toHaveLength(2);const day=new Date().toISOString().slice(0,10);const analytics=await agent.get('/api/admin/analytics/registrations').query({fromDate:day,toDate:day,groupBy:'DAY'});expect(analytics.status).toBe(200);expect(analytics.body.data.summary.businessOwnerRegistrations).toBe(1);expect(analytics.body.data.periods[0].period).toBe(day);});
  test('escapes query text, filters partial search and sets pagination headers', async () => {
    const agent = await loggedIn();
    await BusinessOwner.create([{ firstName: 'Ava', email: 'ava@example.com' }, { firstName: 'Eva', email: 'eva@example.com' }]);
    const response=await agent.get('/api/admin/business-owners').query({search:'AV',page:0,size:1});
    expect(response.status).toBe(200);expect(response.body.data).toHaveLength(1);expect(response.body.data[0].email).toBe('ava@example.com');
    expect(response.headers['x-total-count']).toBe('1');expect(response.headers['x-page-number']).toBe('0');expect(response.headers['x-page-size']).toBe('1');
  });
  test('approval creates owner and organization atomically and rejects repeated decision', async () => {
    const admin = await AdminAccount.create({ email: 'super@example.com', passwordHash: 'hash', role: 'SUPER_ADMIN' });
    const r = await BusinessRequest.create({ firstName: 'Mira', ownerEmail: 'mira@example.com', organizationName: 'Acme Learning', organizationEmail: 'office@acme.test', pendingKey: 'mira@example.com|acme learning|office@acme.test' });
    const approved=await requestsService.decide(r.id,'APPROVED',String(admin._id));
    expect(approved.history).toHaveLength(1);
    expect(await BusinessOwner.countDocuments()).toBe(1); expect(await Organization.countDocuments()).toBe(1);
    await expect(requestsService.decide(r.id,'APPROVED',String(admin._id))).rejects.toMatchObject({status:409});
  });
  test('CSV exports above the row cap return 413',async()=>{const agent=await loggedIn();const spy=jest.spyOn(BusinessOwner,'countDocuments').mockResolvedValue(10001);try{const response=await agent.get('/api/admin/reports/business-owners.csv');expect(response.status).toBe(413);}finally{spy.mockRestore();}});
});
