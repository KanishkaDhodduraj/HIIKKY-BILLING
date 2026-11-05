import { Router } from 'express';
import { z } from 'zod';
import Course from '../../models/Course.js';
import CourseInstallment from '../../models/CourseInstallment.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { assertObjectId, primaryOrganizationId, tenantFilter } from '../shared/ownerRepository.js';

const router = Router();
const input = z.object({ installmentNumber: z.number().int().min(1), installmentName: z.string().trim().min(1).max(100), amount: z.number().finite().min(0), dueDays: z.number().int().min(0).optional(), dueDate: z.coerce.date().nullable().optional() });
const view = (item) => ({ id: String(item._id), courseId: String(item.courseId), organizationId: String(item.organizationId), installmentNumber: item.installmentNumber, installmentName: item.installmentName, amount: item.amount, dueDays: item.dueDays, dueDate: item.dueDate });
async function scopedCourse(req, courseId) {
  assertObjectId(courseId);
  const course = await Course.findOne(tenantFilter(req, { _id: courseId }));
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
  return course;
}

router.get('/:courseId/installments', async (req, res, next) => {
  try {
    const course = await scopedCourse(req, req.params.courseId);
    const rows = await CourseInstallment.find(tenantFilter(req, { courseId: course._id })).sort({ installmentNumber: 1, _id: 1 });
    return apiResponse(res, { data: rows.map(view) });
  } catch (error) { next(error); }
});
router.post('/:courseId/installments', async (req, res, next) => {
  try {
    const course = await scopedCourse(req, req.params.courseId);
    const values = input.parse(req.body);
    const [row] = await CourseInstallment.create([{ ...values, courseId: course._id, organizationId: primaryOrganizationId(req) }]);
    return apiResponse(res, { status: 201, data: view(row) });
  } catch (error) { next(error); }
});
router.put('/:courseId/installments/:id', async (req, res, next) => {
  try {
    const course = await scopedCourse(req, req.params.courseId);
    assertObjectId(req.params.id);
    const values = input.partial().parse(req.body);
    const row = await CourseInstallment.findOneAndUpdate(tenantFilter(req, { _id: req.params.id, courseId: course._id }), { $set: values }, { new: true, runValidators: true });
    if (!row) throw Object.assign(new Error('Installment not found'), { status: 404 });
    return apiResponse(res, { data: view(row) });
  } catch (error) { next(error); }
});
router.delete('/:courseId/installments/:id', async (req, res, next) => {
  try {
    const course = await scopedCourse(req, req.params.courseId);
    assertObjectId(req.params.id);
    const row = await CourseInstallment.findOneAndDelete(tenantFilter(req, { _id: req.params.id, courseId: course._id }));
    if (!row) throw Object.assign(new Error('Installment not found'), { status: 404 });
    return apiResponse(res, { message: 'Course installment deleted' });
  } catch (error) { next(error); }
});
export default router;
