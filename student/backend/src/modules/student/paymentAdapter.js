import crypto from 'node:crypto';

export class SandboxPaymentAdapter {
  async charge({ amount }) {
    if (!Number.isFinite(amount) || amount < 0) throw Object.assign(new Error('Payment amount cannot be negative'), { status: 400 });
    return {
      provider: 'SANDBOX',
      providerReference: `${amount === 0 ? 'FREE' : 'SBX'}-${crypto.randomBytes(10).toString('hex').toUpperCase()}`,
      status: 'SUCCEEDED',
    };
  }
}

export const paymentAdapter = new SandboxPaymentAdapter();
