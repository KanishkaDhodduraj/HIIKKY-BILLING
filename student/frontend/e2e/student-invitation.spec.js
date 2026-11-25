import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const ownerUrl = process.env.E2E_OWNER_URL || 'http://localhost:5174';
const studentUrl = process.env.E2E_STUDENT_URL || 'http://localhost:5175';
const outboxPath = process.env.E2E_OWNER_OUTBOX
  ? path.resolve(process.env.E2E_OWNER_OUTBOX)
  : path.resolve(process.cwd(), '..', '..', 'owner', 'backend', '.dev-outbox.jsonl');

test.skip(!ownerEmail || !ownerPassword, 'Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD for the shared-stack flow.');

test('owner creates a student who receives an invite, changes password, and opens the dashboard', async ({ browser }) => {
  const context = await browser.newContext();
  const ownerPage = await context.newPage();
  const email = `e2e-${Date.now()}@student-flow.test`;
  const fullName = 'E2E Student';

  await ownerPage.goto(`${ownerUrl}/owner/login`);
  await ownerPage.getByLabel('BUSINESS EMAIL').fill(ownerEmail);
  await ownerPage.getByLabel('PASSWORD').fill(ownerPassword);
  await ownerPage.getByRole('button', { name: /Log in to Dashboard/ }).click();
  await expect(ownerPage).toHaveURL(/\/owner\/dashboard/);
  await ownerPage.goto(`${ownerUrl}/owner/students`);
  await ownerPage.getByRole('button', { name: 'Invite student' }).click();
  await ownerPage.getByLabel('Full name').fill(fullName);
  await ownerPage.getByLabel('Email address').fill(email);
  await ownerPage.getByRole('button', { name: 'Create and invite' }).click();
  await expect(ownerPage.getByRole('status')).toContainText('Student created and invitation sent');

  await expect.poll(async () => {
    try { return (await readFile(outboxPath, 'utf8')).split(/\r?\n/).filter(Boolean).some((line) => line.includes(email)); }
    catch { return false; }
  }, { timeout: 10_000 }).toBe(true);
  const emails = (await readFile(outboxPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const invitation = emails.reverse().find((message) => message.to === email);
  const temporaryPassword = invitation?.text.match(/Temporary password: ([^\s]+)/)?.[1];
  expect(temporaryPassword).toBeTruthy();

  const studentPage = await context.newPage();
  await studentPage.goto(`${studentUrl}/student/login`);
  await studentPage.getByLabel('Email address').fill(email);
  await studentPage.getByLabel('Password').fill(temporaryPassword);
  await studentPage.getByRole('button', { name: /Sign in/ }).click();
  await expect(studentPage).toHaveURL(/\/student\/change-password/);
  await studentPage.getByLabel('Temporary password').fill(temporaryPassword);
  await studentPage.getByLabel('New password').fill('E2E-Secure-77!River');
  await studentPage.getByLabel('Confirm new password').fill('E2E-Secure-77!River');
  await studentPage.getByRole('button', { name: 'Set password and continue' }).click();
  await expect(studentPage).toHaveURL(/\/student\/dashboard/, { timeout: 10_000 });
  await expect(studentPage.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await context.close();
});
