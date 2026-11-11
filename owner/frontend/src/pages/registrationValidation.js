const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const acceptedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const acceptedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

export function getRegistrationFieldErrors(draft, form) {
  const errors = {};
  if (!draft?.firstName?.trim()) errors.firstName = 'Complete your account signup details.';
  if (!emailPattern.test(draft?.ownerEmail || '')) errors.ownerEmail = 'Enter a valid signup email.';
  if (!form.organizationName.trim()) errors.organizationName = 'Legal company name is required.';
  if (!emailPattern.test(form.organizationEmail.trim())) errors.organizationEmail = 'Enter a valid organization email.';
  const count = Number(form.projectedStudentCount);
  if (form.projectedStudentCount === '' || !Number.isInteger(count) || count < 0) {
    errors.projectedStudentCount = 'Enter a whole number of 0 or more.';
  }
  return errors;
}

export function validateRegistrationDocument(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!acceptedExtensions.has(extension) || (file.type && !acceptedMimeTypes.has(file.type))) {
    return 'Choose a PDF, JPG, or PNG file.';
  }
  if (file.size > MAX_DOCUMENT_SIZE) return 'The document must be 5 MB or smaller.';
  return '';
}