import BusinessOwner from '../models/BusinessOwner.js';
import Organization from '../models/Organization.js';
import Subscriber from '../models/Subscriber.js';

export async function requireStudent(req, _res, next) {
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
    req.student = student;
    req.organization = organization;
    return next();
  } catch (error) { return next(error); }
}
