// El navegador usa el proxy HTTPS local de Nginx; éste reenvía /api al Gateway.
export const api = process.env.NEXT_PUBLIC_API_URL || '/api';
let redirectingAfterExpiry = false;

export async function request(path:string, options:RequestInit={}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    credentials:'include',
    headers:{'Content-Type':'application/json',...(options.headers||{})}
  });

  if (response.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    if (!redirectingAfterExpiry) {
      redirectingAfterExpiry = true;
      try {
        await fetch(`${api}/auth/logout`, {method:'POST', credentials:'include'});
      } finally {
        window.location.replace('/');
      }
    }
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  if (!response.ok) throw new Error((await response.text())||'La solicitud no pudo completarse');
  return response.json();
}
