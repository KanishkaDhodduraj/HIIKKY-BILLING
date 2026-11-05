import { assertObjectId } from './ownerRepository.js';

export function createOwnerService(repository) {
  return {
    async list(req, options) { return repository.list(req, options); },
    async get(req, id) {
      assertObjectId(id);
      const record = await repository.find(req, id);
      if (!record) throw Object.assign(new Error('Record not found'), { status: 404 });
      return record;
    },
    async create(req, data) { return repository.create(req, data); },
    async update(req, id, data) {
      assertObjectId(id);
      const record = await repository.update(req, id, data);
      if (!record) throw Object.assign(new Error('Record not found'), { status: 404 });
      return record;
    },
    async remove(req, id) {
      assertObjectId(id);
      const record = await repository.remove(req, id);
      if (!record) throw Object.assign(new Error('Record not found'), { status: 404 });
      return record;
    },
  };
}
