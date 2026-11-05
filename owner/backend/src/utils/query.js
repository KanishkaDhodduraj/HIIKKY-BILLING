export const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const regex = (value) => new RegExp(escapeRegex(value), 'i');

export function pageSpec(query, allowed, defaults = {}) {
  const page = Number(query.page ?? defaults.page ?? 0);
  const size = Number(query.size ?? defaults.size ?? 20);
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw Object.assign(new Error('Invalid page or size'), { status: 400 });
  }
  const sortBy = query.sortBy || defaults.sortBy || 'id';
  const direction = String(query.sortDirection || defaults.sortDirection || 'ASC').toUpperCase();
  if (!allowed.includes(sortBy) || !['ASC', 'DESC'].includes(direction)) {
    throw Object.assign(new Error('Unsupported sort field or direction'), { status: 400 });
  }
  const sortField = sortBy === 'id' ? '_id' : sortBy;
  return { page, size, sort: { [sortField]: direction === 'ASC' ? 1 : -1, ...(sortField === '_id' ? {} : { _id: 1 }) }, skip: page * size };
}

export function setPageHeaders(res, total, page, size) {
  res.set({ 'X-Total-Count': String(total), 'X-Page-Number': String(page), 'X-Page-Size': String(size) });
}
