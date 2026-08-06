export function validInstitutionalEmail(email: string, domains: string[] = defaultDomains()): boolean {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');
  return parts.length === 2 && /^[^\s@]+$/.test(parts[0]) && domains.includes(parts[1]);
}

function defaultDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || 'ingenieria.usac.edu.gt,ing.usac.edu.gt')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
