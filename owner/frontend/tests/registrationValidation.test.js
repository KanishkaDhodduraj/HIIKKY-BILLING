import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegistrationFieldErrors, MAX_DOCUMENT_SIZE, validateRegistrationDocument } from '../src/pages/registrationValidation.js';

const signup = { firstName: 'Jordan', ownerEmail: 'jordan@example.com' };
const validForm = { organizationName: 'Northstar Academy', organizationEmail: 'admin@northstar.example', projectedStudentCount: '500' };

test('submission eligibility depends on required fields, not a subscription plan', () => {
  assert.deepEqual(getRegistrationFieldErrors(signup, validForm), {});
});

test('required organization fields and student count are validated', () => {
  const errors = getRegistrationFieldErrors(signup, { ...validForm, organizationName: ' ', organizationEmail: 'bad', projectedStudentCount: '-1' });
  assert.ok(errors.organizationName);
  assert.ok(errors.organizationEmail);
  assert.ok(errors.projectedStudentCount);
});

test('document picker accepts PDF, JPG, and PNG up to 5 MB', () => {
  assert.equal(validateRegistrationDocument({ name: 'license.pdf', type: 'application/pdf', size: MAX_DOCUMENT_SIZE }), '');
  assert.equal(validateRegistrationDocument({ name: 'license.exe', type: 'application/octet-stream', size: 12 }), 'Choose a PDF, JPG, or PNG file.');
  assert.equal(validateRegistrationDocument({ name: 'license.png', type: 'image/png', size: MAX_DOCUMENT_SIZE + 1 }), 'The document must be 5 MB or smaller.');
});