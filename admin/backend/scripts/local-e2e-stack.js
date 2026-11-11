import bcrypt from 'bcrypt';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = 'development';
process.env.SESSION_SECRET = 'local-e2e-session-secret-for-isolated-stack';
process.env.GATEWAY_ENCRYPTION_KEY = 'local-e2e-gateway-encryption-key-value';
process.env.SETTINGS_ENCRYPTION_KEY = 'local-e2e-settings-encryption-key-value';
process.env.ADMIN_BOOTSTRAP_SECRET = 'local-e2e-bootstrap-secret';
const frontendPorts = {
  admin: Number(process.env.E2E_ADMIN_FRONTEND_PORT || 5173),
  owner: Number(process.env.E2E_OWNER_FRONTEND_PORT || 5174),
  student: Number(process.env.E2E_STUDENT_FRONTEND_PORT || 5175),
};
const host = process.env.E2E_HOST || 'localhost';
const apiPorts = {
  admin: Number(process.env.E2E_ADMIN_API_PORT || 5000),
  owner: Number(process.env.E2E_OWNER_API_PORT || 5001),
  student: Number(process.env.E2E_STUDENT_API_PORT || 5002),
};
process.env.CLIENT_ORIGIN = `http://${host}:${frontendPorts.admin}`;
process.env.OWNER_CLIENT_ORIGIN = `http://${host}:${frontendPorts.owner}`;
process.env.STUDENT_CLIENT_ORIGIN = `http://${host}:${frontendPorts.student}`;
process.env.PRIVATE_DOCUMENTS_DIR = `${process.cwd()}\\private-documents-e2e`;

const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = replicaSet.getUri();

const [{ connectDatabase: connectAdmin }, { connectDatabase: connectOwner }, { connectDatabase: connectStudent }, { createApp: createAdminApp }, { createApp: createOwnerApp }, { createApp: createStudentApp }, { env: adminEnv }, { env: ownerEnv }, { env: studentEnv }, { default: AdminAccount }, { default: BusinessOwner }, { default: Organization }, { default: Subscriber }, { default: Subscription }, { default: Course }, { default: CourseInstallment }, { default: Billing }, { default: StudentCourse }, { default: BillingNotification }] = await Promise.all([
  import('../src/config/db.js'),
  import('../../../owner/backend/src/config/db.js'),
  import('../../../student/backend/src/config/db.js'),
  import('../src/app.js'),
  import('../../../owner/backend/src/app.js'),
  import('../../../student/backend/src/app.js'),
  import('../src/config/env.js'),
  import('../../../owner/backend/src/config/env.js'),
  import('../../../student/backend/src/config/env.js'),
  import('../src/models/AdminAccount.js'),
  import('../../../owner/backend/src/models/BusinessOwner.js'),
  import('../../../owner/backend/src/models/Organization.js'),
  import('../../../owner/backend/src/models/Subscriber.js'),
  import('../../../student/backend/src/models/Subscription.js'),
  import('../../../student/backend/src/models/Course.js'),
  import('../../../student/backend/src/models/CourseInstallment.js'),
  import('../../../student/backend/src/models/Billing.js'),
  import('../../../student/backend/src/models/StudentCourse.js'),
  import('../../../student/backend/src/models/BillingNotification.js'),
]);

adminEnv.port = apiPorts.admin;
adminEnv.sessionSecret = 'local-e2e-admin-session-secret-for-isolated-stack';
ownerEnv.port = apiPorts.owner;
ownerEnv.clientOrigin = `http://${host}:${frontendPorts.owner}`;
ownerEnv.sessionSecret = 'local-e2e-owner-session-secret-for-isolated-stack';
studentEnv.port = apiPorts.student;
studentEnv.clientOrigin = `http://${host}:${frontendPorts.student}`;
studentEnv.sessionSecret = 'local-e2e-student-session-secret-for-isolated-stack';
await Promise.all([connectAdmin(), connectOwner(), connectStudent()]);
await AdminAccount.create({ email: 'e2e-admin@hiikky.test', passwordHash: await bcrypt.hash('E2EAdminPassword123!', 4), role: 'SUPER_ADMIN' });
const foreignOwner = await BusinessOwner.create({ firstName: 'Foreign', lastName: 'Tenant', email: 'foreign-tenant@hiikky.test' });
const foreignOrganization = await Organization.create({ name: 'Foreign Tenant Academy', email: 'foreign-academy@hiikky.test', ownerId: foreignOwner._id });
await Subscriber.create({ organizationId: foreignOrganization._id, fullName: 'Foreign Student', email: 'foreign-student@hiikky.test' });

const studentPassword = process.env.E2E_STUDENT_PASSWORD;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
if (studentPassword && ownerPassword) {
  const studentOwner = await BusinessOwner.create({
    firstName: 'Learning', lastName: 'Owner', email: 'e2e-owner@hiikky.test', status: 'ACTIVE',
    passwordHash: await bcrypt.hash(ownerPassword, 4), passwordSetAt: new Date(),
  });
  const studentOrganization = await Organization.create({ name: 'E2E Learning Academy', email: 'e2e-academy@hiikky.test', ownerId: studentOwner._id, status: 'ACTIVE' });
  const plan = await Subscription.create({ organizationId: studentOrganization._id, planName: 'Learning Plan', description: 'Monthly learning access', price: 89, billingCycle: 'MONTHLY', status: 'ACTIVE' });
  const course = await Course.create({ organizationId: studentOrganization._id, courseCode: 'E2E-101', courseName: 'Learning Foundations', category: 'Foundations', instructorName: 'Learning Team', durationHours: 8, status: 'PUBLISHED' });
  await CourseInstallment.create({ organizationId: studentOrganization._id, courseId: course._id, installmentNumber: 1, installmentName: 'First installment', amount: 89, dueDays: 7, dueDate: new Date(Date.now() + 7 * 86400000) });
  const student = await Subscriber.create({
    organizationId: studentOrganization._id, subscriptionId: plan._id, fullName: 'E2E Student',
    email: 'e2e-student@hiikky.test', status: 'ACTIVE', registrationStatus: 'APPROVED',
    passwordHash: await bcrypt.hash(studentPassword, 4), passwordSetAt: new Date(),
  });
  await StudentCourse.create({ organizationId: studentOrganization._id, subscriberId: student._id, courseId: course._id, progressPercent: 35, status: 'ACTIVE', lastAccessedAt: new Date() });
  await Billing.create({ organizationId: studentOrganization._id, subscriberId: student._id, subscriptionId: plan._id, invoiceNumber: 'INV-E2E-STUDENT-001', paymentName: 'Learning Plan', dueDate: new Date(Date.now() + 7 * 86400000), amount: 89, paymentStatus: 'UNPAID' });
  await BillingNotification.create({ organizationId: studentOrganization._id, subscriberId: student._id, recipientEmail: student.email, recipientName: student.fullName, recipientGroup: 'INDIVIDUAL', notificationType: 'ANNOUNCEMENT', subject: 'Welcome to your workspace', message: 'Your E2E learning workspace is ready.', status: 'SENT' });
  console.log('E2E Owner login: e2e-owner@hiikky.test (password supplied by E2E_OWNER_PASSWORD).');
  console.log('E2E Student login: e2e-student@hiikky.test (password supplied by E2E_STUDENT_PASSWORD).');
}

const adminServer = createAdminApp().listen(apiPorts.admin, () => console.log(`Admin API: http://${host}:${apiPorts.admin} (in-memory replica set)`));
const ownerServer = createOwnerApp().listen(apiPorts.owner, () => console.log(`Owner API: http://${host}:${apiPorts.owner} (in-memory replica set)`));
const studentServer = createStudentApp().listen(apiPorts.student, () => console.log(`Student API: http://${host}:${apiPorts.student} (in-memory replica set)`));
console.log('E2E Admin login: e2e-admin@hiikky.test / E2EAdminPassword123!');
console.log('E2E isolation fixture: one active subscriber exists in a separate tenant.');

async function shutdown() {
  await Promise.all([new Promise((resolve) => adminServer.close(resolve)), new Promise((resolve) => ownerServer.close(resolve)), new Promise((resolve) => studentServer.close(resolve))]);
  const adminMongoose = await import('mongoose');
  const ownerMongoose = await import('../../../owner/backend/node_modules/mongoose/index.js');
  const studentMongoose = await import('../../../student/backend/node_modules/mongoose/index.js');
  await Promise.all([adminMongoose.default.disconnect(), ownerMongoose.default.disconnect(), studentMongoose.default.disconnect()]);
  await replicaSet.stop();
}

process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));
process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));