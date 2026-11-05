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

let repl, app;
beforeAll(async () => { repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(repl.getUri()); app = createApp(); }, 120000);
afterEach(async () => { for (const model of [AdminAccount, BusinessRequest, BusinessOwner, Organization]) await model.deleteMany({}); });
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
