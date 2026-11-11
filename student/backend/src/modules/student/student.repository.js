import Billing from '../../models/Billing.js';
import BillingNotification from '../../models/BillingNotification.js';
import Course from '../../models/Course.js';
import CourseInstallment from '../../models/CourseInstallment.js';
import Payment from '../../models/Payment.js';
import StudentCourse from '../../models/StudentCourse.js';
import StudentNotificationState from '../../models/StudentNotificationState.js';
import StudentPaymentMethod from '../../models/StudentPaymentMethod.js';
import Subscription from '../../models/Subscription.js';

const scope = (req, extra = {}) => ({ organizationId: req.organization._id, subscriberId: req.student._id, ...extra });

export const studentRepository = {
  invoices(req, extra = {}) { return Billing.find(scope(req, extra)).sort({ createdAt: -1, _id: 1 }); },
  invoice(req, id) { return Billing.findOne(scope(req, { _id: id })); },
  payments(req) { return Payment.find(scope(req)).sort({ paidAt: -1, _id: 1 }); },
  paymentMethods(req) { return StudentPaymentMethod.find(scope(req)).sort({ isDefault: -1, createdAt: 1 }); },
  plan(req, id) { return Subscription.findOne({ organizationId: req.organization._id, _id: id, status: 'ACTIVE' }); },
  plans(req) { return Subscription.find({ organizationId: req.organization._id, status: 'ACTIVE' }).sort({ price: 1, _id: 1 }); },
  course(req, id) { return Course.findOne({ organizationId: req.organization._id, _id: id, status: 'PUBLISHED' }); },
  courses(req, extra = {}) { return Course.find({ organizationId: req.organization._id, status: 'PUBLISHED', ...extra }); },
  courseProgress(req, courseIds) {
    return StudentCourse.find(scope(req, { courseId: { $in: courseIds } }));
  },
  installments(req, courseId) {
    return CourseInstallment.find({ organizationId: req.organization._id, courseId }).sort({ installmentNumber: 1, _id: 1 });
  },
  notifications(req, extra = {}) {
    return BillingNotification.find({
      organizationId: req.organization._id,
      $or: [{ subscriberId: req.student._id }, { subscriberId: null, recipientEmail: req.student.email }],
      ...extra,
    }).sort({ createdAt: -1, _id: 1 });
  },
  notificationStates(req, notificationIds) {
    return StudentNotificationState.find(scope(req, { notificationId: { $in: notificationIds } }));
  },
};

export { scope as studentScope };
