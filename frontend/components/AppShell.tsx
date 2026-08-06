'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { request, type SessionResponse, type SessionUser } from './api';

const study = [
  ['/catalogo', 'Explorar videos', 'video'],
  ['/historial', 'Continuar viendo', 'history'],
  ['/cursos', 'Mis cursos', 'book'],
  ['/configuracion', 'Configuración', 'settings'],
] as const;
const control = [
  ['/admin', 'Resumen', 'grid'],
  ['/admin', 'Usuarios y roles', 'users'],
  ['/admin', 'Contenido', 'video'],
  ['/admin', 'Importaciones CSV', 'upload'],
  ['/admin', 'Auditoría', 'audit'],
] as const;
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'US'
  );
}

export function AppShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const links = admin ? control : study;

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch(() => undefined);
  }, []);

  const isActive = (href: string, label: string) => {
    if (pathname === '/catalogo') return label === 'Explorar videos';
    if (pathname === '/admin') return label === 'Resumen';
    if (pathname.startsWith('/reproductor')) return label === 'Explorar videos';
    return pathname === href;
  };

  async function logout() {
    setLoggingOut(true);
    try {
      await request('/auth/logout', { method: 'POST' });
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = admin ? 'Administración' : profile?.full_name || profile?.fullName || 'Usuario';
  const displayRole = admin ? 'Administrador' : 'Estudiante';
  const displayInitials = admin ? 'AD' : initials(profile?.full_name || profile?.fullName || 'Usuario');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={admin ? '/admin' : '/catalogo'} className="side-brand">
          yoUSAC
        </Link>
        <p className="side-kicker">{admin ? 'CENTRO DE CONTROL' : 'ÁREA DE ESTUDIO'}</p>
        <nav className="side-nav">
          {links.slice(0, 4).map(([href, label, icon]) => (
            <Link key={label} href={href} className={isActive(href, label) ? 'active' : ''}>
              <Icon name={icon} />
              {label}
            </Link>
          ))}
          <div className="side-divider" />
          {admin && <p className="side-section">SISTEMA</p>}
          {links.slice(4).map(([href, label, icon]) => (
            <Link key={label} href={href} className={isActive(href, label) ? 'active' : ''}>
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="side-user-wrap">
          {profileOpen && (
            <button className="logout-button" onClick={logout} disabled={loggingOut}>
              <Icon name="logout" size={18} />
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          )}
          <button className="side-user" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
            <span>{displayInitials}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{displayRole}</small>
            </div>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <button className="icon-button" aria-label="Notificaciones">
            <Icon name="bell" />
          </button>
          <div className="avatar">{displayInitials}</div>
        </header>
        {children}
      </main>
    </div>
  );
}
