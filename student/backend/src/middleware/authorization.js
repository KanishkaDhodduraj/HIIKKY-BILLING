import BusinessOwner from '../models/BusinessOwner.js';
import Organization from '../models/Organization.js';
import Subscriber from '../models/Subscriber.js';

async function loadStudent(req, next, allowPasswordChange) {
  const sessionStudent = req.session?.student;
  if (!sessionStudent?.id || !sessionStudent?.organizationId) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
  try {
    const student = await Subscriber.findOne({ _id: sessionStudent.id, organizationId: sessionStudent.organizationId });
    const organization = student ? await Organization.findOne({ _id: student.organizationId, status: 'ACTIVE' }) : null;
    const owner = organization?.ownerId ? await BusinessOwner.findOne({ _id: organization.ownerId, status: 'ACTIVE' }) : null;
    if (!student || !organization || !owner || student.accessBlocked || !['ACTIVE', 'TRIALING'].includes(student.status) || student.registrationStatus !== 'APPROVED') {
      await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
      return next(Object.assign(new Error('Student account is inactive or unavailable'), { status: 401 }));
    }
    if (!allowPasswordChange && (sessionStudent.passwordChangeRequired || student.mustChangePassword)) {
      return next(Object.assign(new Error('Set a new password before continuing'), { status: 403, code: 'PASSWORD_CHANGE_REQUIRED' }));
    }
    req.student = student;
    req.organization = organization;
    return next();
  } catch (error) { return next(error); }
}

export function requireStudent(req, _res, next) {
  return loadStudent(req, next, false);
}

export function requireStudentForAuth(req, _res, next) {
  return loadStudent(req, next, true);
}
