import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import Organization from '../../models/Organization.js';

let transport;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function getTransport() {
  if (!env.smtpHost) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    });
  }
  return transport;
}

async function deliver(message) {
  const mailTransport = env.nodeEnv === 'test' || !env.smtpHost ? null : getTransport();
  if (!mailTransport) {
    if (env.nodeEnv === 'production') throw new Error('Student email provider is not configured');
    const outbox = path.resolve(process.cwd(), env.studentDevOutboxPath);
    await mkdir(path.dirname(outbox), { recursive: true });
    await appendFile(outbox, `${JSON.stringify({ ...message, createdAt: new Date().toISOString() })}\n`, { encoding: 'utf8', mode: 0o600 });
    return;
  }
  try {
    await mailTransport.sendMail({ from: env.mailFrom, ...message });
  } catch {
    throw new Error('Student email provider could not deliver the message');
  }
}

export async function sendSetPasswordLink(student, token, expiresInMs = 48 * 60 * 60 * 1000) {
  const link = `${env.passwordBaseUrl}?token=${encodeURIComponent(token)}`;
  const minutes = Math.round(expiresInMs / 60_000);
  const duration = minutes >= 60 ? `${Math.round(minutes / 60)} hours` : `${minutes} minutes`;
  const safeName = escapeHtml(student.fullName);
  const safeLink = escapeHtml(link);
  await deliver({
    to: student.email,
    subject: expiresInMs <= 30 * 60 * 1000 ? 'Reset your HIIKKY Student Portal password' : 'Set your HIIKKY Student Portal password',
    text: `Hello ${student.fullName},\n\nUse this one-time link to set your password (expires in ${duration}):\n${link}`,
    html: `<main style="max-width:560px;margin:24px auto;padding:24px;font-family:Arial,sans-serif;color:#17223b"><h1>Password assistance</h1><p>Hello ${safeName}, use the one-time link below to set a new password. It expires in ${duration}.</p><p><a href="${safeLink}" style="display:inline-block;padding:14px 20px;background:#5b3be5;color:#fff;text-decoration:none;border-radius:8px">Set a new password</a></p></main>`,
  });
}

export async function sendPasswordChanged(student) {
  const organization = await Organization.findById(student.organizationId).select('name email');
  const organizationName = organization?.name || 'your organization';
  const safeName = escapeHtml(student.fullName);
  const safeOrgName = escapeHtml(organizationName);
  const supportEmail = escapeHtml(organization?.email || '');
  const supportLine = organization?.email ? `If this was not you, contact ${organization.email}.` : 'If this was not you, contact your organization.';
  await deliver({
    to: student.email,
    subject: 'Your HIIKKY Student Portal password was changed',
    text: `Hello ${student.fullName},\n\nThe password for your ${organizationName} student account was changed.\n\n${supportLine}`,
    html: `<main style="max-width:560px;margin:24px auto;padding:24px;font-family:Arial,sans-serif;color:#17223b"><h1>Password changed</h1><p>Hello ${safeName}, the password for your ${safeOrgName} student account was changed.</p><p>${organization?.email ? `If this was not you, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.` : 'If this was not you, contact your organization.'}</p></main>`,
  });
}
