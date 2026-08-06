import { randomBytes, timingSafeEqual } from 'node:crypto';

export const institutionalDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ingenieria.usac.edu.gt,ing.usac.edu.gt')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export function validInstitutionalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');
  return parts.length === 2 && /^[^\s@]+$/.test(parts[0]) && institutionalDomains.includes(parts[1]);
}

export function createOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function sameOAuthState(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
