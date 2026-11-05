import { z } from 'zod';
import Course from '../../models/Course.js';
import { createCrudModule } from '../shared/crudModule.js';

export default createCrudModule({
  Model: Course, basePath: 'courses',
  fields: { courseCode: z.string().trim().min(1).max(40), courseName: z.string().trim().min(1).max(200), category: z.string().max(100).optional(), instructorName: z.string().max(150).optional(), durationHours: z.number().min(0).optional(), price: z.number().min(0).optional(), status: z.enum(['PUBLISHED', 'DRAFT', 'SCHEDULED', 'ARCHIVED']).optional() },
  sorts: ['id', 'courseCode', 'courseName', 'category', 'status', 'createdAt'], searchFields: ['courseCode', 'courseName', 'category', 'instructorName'], statusValues: ['PUBLISHED', 'DRAFT', 'SCHEDULED', 'ARCHIVED'],
  beforeSave: async (_req, data) => { if (data.courseCode) data.courseCode = data.courseCode.toUpperCase(); },
});
