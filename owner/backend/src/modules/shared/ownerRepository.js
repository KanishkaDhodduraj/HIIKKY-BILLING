import mongoose from 'mongoose';
import { pageSpec, setPageHeaders } from '../../utils/query.js';

export const objectIdSchema = (value) => /^[a-f\d]{24}$/i.test(String(value));
export function assertObjectId(value) {
  if (!objectIdSchema(value)) throw Object.assign(new Error('Invalid id'), { status: 400 });
}
export function tenantFilter(req, extra = {}) {
  const ids = (req.ownerOrganizationIds || []).filter(objectIdSchema).map((id) => new mongoose.Types.ObjectId(id));
  return { ...extra, organizationId: { $in: ids } };
}
export function primaryOrganizationId(req) {
  const id = (req.ownerOrganizationIds || []).find(objectIdSchema);
  if (!id) throw Object.assign(new Error('No active organization is assigned to this owner'), { status: 403 });
  return new mongoose.Types.ObjectId(id);
}

export function createOwnerRepository(Model) {
  return {
    async list(req, { filter = {}, sorts, defaults, page = req.query } = {}) {
      const spec = pageSpec(page, sorts, defaults);
      const query = tenantFilter(req, filter);
      const [rows, total] = await Promise.all([Model.find(query).sort(spec.sort).skip(spec.skip).limit(spec.size), Model.countDocuments(query)]);
      return { rows, total, page: spec.page, size: spec.size };
    },
    find(req, id, extra = {}) { return Model.findOne(tenantFilter(req, { _id: id, ...extra })); },
    create(req, fields) { return Model.create({ ...fields, organizationId: primaryOrganizationId(req) }); },
    update(req, id, fields, extra = {}) { return Model.findOneAndUpdate(tenantFilter(req, { _id: id, ...extra }), { $set: fields }, { new: true, runValidators: true }); },
    remove(req, id, extra = {}) { return Model.findOneAndDelete(tenantFilter(req, { _id: id, ...extra })); },
    scope(req, filter = {}) { return tenantFilter(req, filter); },
    Model,
  };
}

export function respondPage(res, pageResult, data) {
  setPageHeaders(res, pageResult.total, pageResult.page, pageResult.size);
  return data;
}
