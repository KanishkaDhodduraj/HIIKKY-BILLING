import { Router } from 'express';
import { z } from 'zod';
import { apiResponse } from '../../utils/apiResponse.js';
import { regex, setPageHeaders } from '../../utils/query.js';
import { assertObjectId, createOwnerRepository, tenantFilter } from './ownerRepository.js';
import { createOwnerService } from './ownerService.js';

const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
const view = (record) => ({ ...record.toObject(), id: String(record._id), organizationId: String(record.organizationId) });

export function createCrudModule({ Model, basePath, fields, sorts, searchFields = [], filters = ['status'], statusValues = [], beforeSave }) {
  const repository = createOwnerRepository(Model);
  const service = createOwnerService(repository);
  const router = Router();
  const createSchema = z.object(fields);
  const patchSchema = createSchema.partial();
  const filterFromRequest = (req) => {
    const filter = {};
    if (req.query.search !== undefined) {
      if (String(req.query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
      const term = regex(String(req.query.search));
      filter.$or = searchFields.map((field) => ({ [field]: term }));
    }
    for (const key of filters) if (req.query[key] !== undefined && req.query[key] !== '') filter[key] = req.query[key];
    return filter;
  };
  const performSave = async (req, data, id) => {
    const values = id ? patchSchema.parse(data) : createSchema.parse(data);
    await beforeSave?.(req, values, { id, repository });
    return id ? service.update(req, id, values) : service.create(req, values);
  };

  router.get('/', async (req, res, next) => {
    try {
      const result = await service.list(req, { filter: filterFromRequest(req), sorts, defaults: { sortBy: 'createdAt', sortDirection: 'DESC' } });
      setPageHeaders(res, result.total, result.page, result.size);
      return apiResponse(res, { data: result.rows.map(view) });
    } catch (error) { next(error); }
  });
  router.get('/export.csv', async (req, res, next) => {
    try {
      const filter = filterFromRequest(req);
      const query = tenantFilter(req, filter);
      const count = await Model.countDocuments(query);
      if (count > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      const rows = await Model.find(query).sort({ createdAt: -1, _id: 1 });
      const headers = Object.keys(fields);
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${basePath}-report.csv"`, 'Cache-Control': 'no-store' });
      return res.send([headers.map(csvCell).join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\r\n'));
    } catch (error) { next(error); }
  });
  router.post('/', async (req, res, next) => {
    try { const row = await performSave(req, req.body); return apiResponse(res, { status: 201, message: `${basePath} record created`, data: view(row) }); }
    catch (error) { next(error); }
  });
  router.get('/:id', async (req, res, next) => {
    try { const row = await service.get(req, req.params.id); return apiResponse(res, { data: view(row) }); }
    catch (error) { next(error); }
  });
  router.put('/:id', async (req, res, next) => {
    try { const row = await performSave(req, req.body, req.params.id); return apiResponse(res, { data: view(row) }); }
    catch (error) { next(error); }
  });
  router.patch('/:id/status', async (req, res, next) => {
    try {
      const { status } = z.object({ status: z.enum(statusValues) }).parse(req.body);
      const row = await service.update(req, req.params.id, { status });
      return apiResponse(res, { data: view(row) });
    } catch (error) { next(error); }
  });
  router.delete('/:id', async (req, res, next) => {
    try { await service.remove(req, req.params.id); return apiResponse(res, { message: `${basePath} record deleted` }); }
    catch (error) { next(error); }
  });
  return router;
}

export function scopedReference(Model, id, req, label) {
  if (!id) return null;
  assertObjectId(id);
  return Model.findOne(tenantFilter(req, { _id: id })).then((record) => {
    if (!record) throw Object.assign(new Error(`${label} not found`), { status: 404 });
    return record;
  });
}
