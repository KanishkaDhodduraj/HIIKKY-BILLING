import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { env } from '../../config/env.js';

const acceptedTypes = new Map([
  ['application/pdf', new Set(['.pdf'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
]);

function uploadError(message) {
  return Object.assign(new Error(message), { status: 400, fieldErrors: { document: message } });
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    fs.mkdir(env.privateDocumentsDir, { recursive: true, mode: 0o700 }).then(() => callback(null, env.privateDocumentsDir), callback);
  },
  filename(_req, _file, callback) {
    callback(null, `${crypto.randomUUID()}.upload`);
  },
});

export const registrationDocumentUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const extensions = acceptedTypes.get(file.mimetype);
    if (!extensions || !extensions.has(path.extname(file.originalname).toLowerCase())) return callback(uploadError('Choose a PDF, JPG, or PNG file.'));
    return callback(null, true);
  },
});

export async function verifyDocumentSignature(file) {
  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    const valid = file.mimetype === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-'
      : file.mimetype === 'image/jpeg'
        ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : bytes.length >= 8 && bytes.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!valid) throw uploadError('The selected file does not match its document type.');
  } finally {
    await handle.close();
  }
}

export async function removeUploadedDocument(file) {
  if (file?.path) await fs.rm(file.path, { force: true }).catch(() => {});
}

export function privateDocumentPath(storageKey) {
  const root = path.resolve(env.privateDocumentsDir);
  const resolved = path.resolve(root, storageKey || '');
  if (!storageKey || !resolved.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Document not found'), { status: 404 });
  return resolved;
}

export function safeDocumentName(file) {
  return path.basename(file.originalname).replace(/[\r\n\0]/g, '').slice(0, 255);
}