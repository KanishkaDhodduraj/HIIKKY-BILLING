import { z } from 'zod';
import BusinessRequest from '../../models/BusinessRequest.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, setPageHeaders, regex } from '../../utils/query.js';
import { env } from '../../config/env.js';
import { privateDocumentPath, removeUploadedDocument, safeDocumentName, verifyDocumentSignature } from './documentStorage.js';
import { requestsService } from './businessRequests.service.js';
import { sendOwnerInvite } from '../owners/ownerInvite.service.js';

const email = z.string().trim().email().max(255).transform((value) => value.toLowerCase());
const optionalPhone = z.preprocess((value) => value === '' ? undefined : value, z.string().trim().max(50).regex(/^[+0-9() .-]*$/).optional());
const submission = z.object({
  firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().max(100).optional(), ownerEmail: email, ownerPhone: optionalPhone,
  organizationName: z.string().trim().min(1).max(255), organizationEmail: email, organizationPhone: optionalPhone, organizationAddress: z.string().trim().max(500).optional(),
  businessType: z.string().trim().max(100).optional(), industry: z.string().trim().max(100).optional(), projectedStudentCount: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().int().min(0).optional()),
  region: z.string().trim().max(100).optional(), operatingRegion: z.string().trim().max(100).optional(), subscriptionTier: z.string().trim().max(100).optional(),
  documents: z.array(z.object({ name: z.string().max(255), url: z.string().url().max(2000).optional() })).max(10).optional(),
  documentsSkipped: z.preprocess((value) => value === 'true' ? true : value === 'false' ? false : value, z.boolean().optional()),
});
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

function filters(query) {
  const result = {};
  if (query.status) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(query.status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
    result.status = query.status;
  }
  if (query.search) {
    if (query.search.length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
    const search = regex(query.search);
    result.$or = ['firstName', 'lastName', 'ownerEmail', 'organizationName', 'organizationEmail'].map((key) => ({ [key]: search }));
  }
  if (Boolean(query.fromDate) !== Boolean(query.toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
  if (query.fromDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) throw Object.assign(new Error('Dates must use YYYY-MM-DD'), { status: 400 });
    const from = new Date(`${query.fromDate}T00:00:00.000Z`), to = new Date(`${query.toDate}T23:59:59.999Z`);
    if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 });
    result.createdAt = { $gte: from, $lte: to };
  }
  return result;
}

function safeDocument(document, requestId) {
  if (!document) return null;
  return {
    id: String(document._id), name: document.name, mimeType: document.mimeType || '', size: document.size || null,
    downloadUrl: document.storageKey ? `/admin/business-requests/${requestId}/documents/${document._id}` : document.url || null,
  };
}

function serializeRequest(request) {
  const id = String(request._id);
  return {
    id, firstName: request.firstName, lastName: request.lastName, ownerEmail: request.ownerEmail, ownerPhone: request.ownerPhone,
    organizationName: request.organizationName, organizationEmail: request.organizationEmail, organizationPhone: request.organizationPhone, organizationAddress: request.organizationAddress,
    businessType: request.businessType || request.industry || '', industry: request.industry || request.businessType || '', projectedStudentCount: request.projectedStudentCount,
    region: request.region || request.operatingRegion || '', operatingRegion: request.operatingRegion || request.region || '', subscriptionTier: request.subscriptionTier,
    documents: (request.documents || []).map((document) => safeDocument(document, id)).filter(Boolean), documentsSkipped: request.documentsSkipped,
    status: request.status, decisionReason: request.decisionReason, decidedAt: request.decidedAt, createdAt: request.createdAt, history: request.history,
  };
}

function normalizeBody(body, file) {
  const input = submission.parse({ ...body, documentsSkipped: file ? false : body.documentsSkipped });
  const documents = [...(input.documents || [])];
  if (file) documents.push({ name: safeDocumentName(file), storageKey: file.filename, mimeType: file.mimetype, size: file.size });
  return {
    ...input,
    businessType: input.businessType || input.industry || '', industry: input.industry || input.businessType || '',
    region: input.region || input.operatingRegion || '', operatingRegion: input.operatingRegion || input.region || '',
    documents, documentsSkipped: file ? false : input.documentsSkipped ?? documents.length === 0,
  };
}

export const requestsController = {
  async intake(req, res, next) {
    try {
      if (req.file) await verifyDocumentSignature(req.file);
      const request = await requestsService.intake(normalizeBody(req.body, req.file));
      return apiResponse(res, { status: 201, message: 'Application received', data: { id: String(request._id), status: request.status, submittedAt: request.createdAt } });
    } catch (error) {
      await removeUploadedDocument(req.file);
      return next(error);
    }
  },
  async publicStatus(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid application reference'), { status: 400 });
      const request = await BusinessRequest.findById(req.params.id).select('status organizationName createdAt decidedAt decisionReason createdOwnerId');
      if (!request) throw Object.assign(new Error('Application not found'), { status: 404 });
      return apiResponse(res, { data: { id: String(request._id), status: request.status, organizationName: request.organizationName, submittedAt: request.createdAt, decidedAt: request.decidedAt || null, decisionReason: request.decisionReason || null, setPasswordAvailable: request.status === 'APPROVED' && Boolean(request.createdOwnerId) } });
    } catch (error) { return next(error); }
  },
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'createdAt', 'status'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const filter = filters(req.query);
      const [rows, total] = await Promise.all([BusinessRequest.find(filter).select('+documents.storageKey').sort(page.sort).skip(page.skip).limit(page.size), BusinessRequest.countDocuments(filter)]);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: rows.map(serializeRequest) });
    } catch (error) { return next(error); }
  },
  async csv(req, res, next) {
    try {
      const filter = filters(req.query), total = await BusinessRequest.countDocuments(filter);
      if (total > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      const rows = await BusinessRequest.find(filter).sort({ createdAt: -1, _id: 1 });
      const headers = ['id', 'firstName', 'lastName', 'ownerEmail', 'organizationName', 'organizationEmail', 'businessType', 'projectedStudentCount', 'region', 'organizationAddress', 'status', 'createdAt', 'decidedAt'];
      const cell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="business-requests-report.csv"', 'Cache-Control': 'no-store' });
      return res.send([headers.map(cell).join(','), ...rows.map((row) => headers.map((key) => cell(key === 'id' ? String(row._id) : row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
    } catch (error) { return next(error); }
  },
  async get(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid id'), { status: 400 });
      const request = await BusinessRequest.findById(req.params.id).select('+documents.storageKey');
      if (!request) throw Object.assign(new Error('Business request not found'), { status: 404 });
      return apiResponse(res, { data: serializeRequest(request) });
    } catch (error) { return next(error); }
  },
  async downloadDocument(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success || !idSchema.safeParse(req.params.documentId).success) throw Object.assign(new Error('Invalid document reference'), { status: 400 });
      const request = await BusinessRequest.findById(req.params.id).select('+documents.storageKey');
      const document = request?.documents.id(req.params.documentId);
      if (!document?.storageKey) throw Object.assign(new Error('Document not found'), { status: 404 });
      return res.download(privateDocumentPath(document.storageKey), document.name, { headers: { 'Content-Type': document.mimeType || 'application/octet-stream' } }, (error) => { if (error && !res.headersSent) next(error); });
    } catch (error) { return next(error); }
  },
  async approve(req, res, next) {
    try {
      const request = await requestsService.decide(req.params.id, 'APPROVED', req.session.admin.id);
      const setPasswordUrl = request._ownerInvite ? await sendOwnerInvite(request._ownerInvite.owner, request._ownerInvite.token, 'invite') : null;
      return apiResponse(res, { message: 'Application approved and owner invitation sent', data: { ...serializeRequest(request), ...(env.nodeEnv === 'development' && setPasswordUrl ? { setPasswordUrl } : {}) } });
    } catch (error) { return next(error); }
  },
  async reject(req, res, next) {
    try {
      const { reason } = z.object({ reason: z.string().trim().min(1).max(1000) }).parse(req.body);
      const request = await requestsService.decide(req.params.id, 'REJECTED', req.session.admin.id, reason);
      return apiResponse(res, { message: 'Application rejected', data: serializeRequest(request) });
    } catch (error) { return next(error); }
  },
};