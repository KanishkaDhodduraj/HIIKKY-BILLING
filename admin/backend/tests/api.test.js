import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
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

let repl, app;
beforeAll(async () => { repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(repl.getUri()); app = createApp(); }, 120000);
afterEach(async () => { for (const model of [AdminAccount, BusinessRequest, BusinessOwner, Organization, PlatformPlan, PaymentGateway]) await model.deleteMany({}); });
afterAll(async () => { await mongoose.disconnect(); await repl?.stop(); });

async function csrf(agent) { const r = await agent.get('/api/admin/auth/csrf'); if(!r.body.data?.token) throw new Error(`CSRF endpoint returned ${r.status}: ${JSON.stringify(r.body)}`); return r.body.data.token; }
async function loggedIn(role='SUPER_ADMIN') { const email=`${role.toLowerCase()}@example.com`,password='password123'; await AdminAccount.create({email,passwordHash:await bcrypt.hash(password,4),role});const agent=request.agent(app),token=await csrf(agent);const login=await agent.post('/api/admin/auth/login').set('X-CSRF-TOKEN',token).send({email,password});expect(login.status).toBe(200);return agent; }
describe('admin session and roles', () => {
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
