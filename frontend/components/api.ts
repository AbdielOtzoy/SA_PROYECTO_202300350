// El navegador usa el proxy HTTPS local de Nginx; éste reenvía /api al Gateway.
export const api = process.env.NEXT_PUBLIC_API_URL || '/api';
let redirectingAfterExpiry = false;

export interface SessionUser {
  full_name?: string;
  fullName?: string;
  email: string;
  roles: string[];
  permissions?: string[];
  is_active?: boolean;
}

export interface SessionResponse {
  user: SessionUser;
}

export function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') {
    try {
      const parsed = JSON.parse(cause) as { message?: string; error?: string };
      return parsed.message || parsed.error || cause;
    } catch {
      return cause;
    }
  }
  return 'La solicitud no pudo completarse';
}

export async function request<TResponse = unknown>(path: string, options: RequestInit = {}): Promise<TResponse> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${api}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    if (!redirectingAfterExpiry) {
      redirectingAfterExpiry = true;
      try {
        await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
      } finally {
        window.location.replace('/');
      }
    }
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  if (!response.ok) throw new Error((await response.text()) || 'La solicitud no pudo completarse');
  return (await response.json()) as TResponse;
}
