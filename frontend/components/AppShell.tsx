'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { request, type SessionResponse, type SessionUser } from './api';

type NavLink = { href: string; label: string; icon: IconName };

const studyLinks: NavLink[] = [
  { href: '/catalogo', label: 'Explorar videos', icon: 'video' },
  { href: '/historial', label: 'Continuar viendo', icon: 'history' },
  { href: '/configuracion', label: 'Configuración', icon: 'settings' },
];
const coursesLink: NavLink = { href: '/cursos', label: 'Mis cursos', icon: 'book' };
const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Resumen', icon: 'grid' },
  { href: '/admin/usuarios-roles', label: 'Usuarios y roles', icon: 'users' },
  { href: '/admin/contenido', label: 'Configuración académica', icon: 'settings' },
  { href: '/admin/importaciones', label: 'Importaciones CSV', icon: 'upload' },
  { href: '/admin/notificaciones', label: 'Avisos administrativos', icon: 'bell' },
];
const adminSystemLinks: NavLink[] = [
  { href: '/admin/exportaciones', label: 'Exportaciones', icon: 'database' },
  { href: '/admin/auditoria', label: 'Auditoría', icon: 'audit' },
];
const staffImportLink: NavLink = { href: '/admin/importaciones', label: 'Gestionar grabaciones', icon: 'upload' };

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  teacher: 'Docente',
  assistant: 'Auxiliar',
  student: 'Estudiante',
};

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
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [topbarProfileOpen, setTopbarProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<SessionUser | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch(() => undefined);
  }, []);

  const isAdminProfile = profile?.roles.includes('admin') === true;
  const isStudent = profile?.roles.includes('student') === true;
  const isTeacher = profile?.roles.includes('teacher') === true;
  const isAssistant = profile?.roles.includes('assistant') === true;
  const staffHome = isTeacher ? '/docente' : isAssistant ? '/auxiliar' : '';
  const staffLabel = isTeacher ? 'Área docente' : isAssistant ? 'Área auxiliar' : '';

  const groups = useMemo(() => {
    if (admin) {
      return isAdminProfile
        ? [{ links: adminLinks }, { title: 'SISTEMA', links: adminSystemLinks }]
        : [{ links: [staffImportLink] }];
    }

    const roleLinks: NavLink[] = [];
    if (staffHome && staffLabel) roleLinks.push({ href: staffHome, label: staffLabel, icon: 'book' });
    if (isAdminProfile) roleLinks.push({ href: '/admin', label: 'Panel administrativo', icon: 'grid' });
    if (isTeacher || isAssistant) roleLinks.push(staffImportLink);
    return [{ links: [...studyLinks, ...(isStudent ? [coursesLink] : []), ...roleLinks] }];
  }, [admin, isAdminProfile, isAssistant, isStudent, isTeacher, staffHome, staffLabel]);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    setLoggingOut(true);
    try {
      await request('/auth/logout', { method: 'POST' });
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = profile?.full_name || profile?.fullName || (admin ? 'Administración' : 'Usuario');
  const displayRole =
    profile?.roles?.map((role) => roleLabels[role] || role).join(' · ') ||
    (admin ? 'Panel administrativo' : 'Estudiante');
  const displayInitials = initials(displayName);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          href={admin ? (isAdminProfile ? '/admin' : '/admin/importaciones') : staffHome || '/catalogo'}
          className="side-brand"
        >
          yoUSAC
        </Link>
        <p className="side-kicker">
          {admin ? 'CENTRO DE CONTROL' : isTeacher || isAssistant ? 'ÁREA ACADÉMICA' : 'ÁREA DE ESTUDIO'}
        </p>
        <nav className="side-nav">
          {groups.map((group, index) => (
            <div className="side-nav-group" key={group.title || `group-${index}`}>
              {group.title && <p className="side-section">{group.title}</p>}
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                  <Icon name={link.icon} />
                  {link.label}
                </Link>
              ))}
              {index < groups.length - 1 && <div className="side-divider" />}
            </div>
          ))}
        </nav>
        <div className="side-user-wrap">
          {sidebarProfileOpen && (
            <button className="logout-button" onClick={logout} disabled={loggingOut}>
              <Icon name="logout" size={18} />
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          )}
          <button
            className="side-user"
            onClick={() => setSidebarProfileOpen((open) => !open)}
            aria-expanded={sidebarProfileOpen}
          >
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
          <div className="topbar-profile">
            {topbarProfileOpen && (
              <button className="topbar-logout" onClick={logout} disabled={loggingOut}>
                <Icon name="logout" size={18} />
                {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            )}
            <button
              className="avatar avatar-button"
              onClick={() => setTopbarProfileOpen((open) => !open)}
              aria-expanded={topbarProfileOpen}
              aria-haspopup="menu"
              aria-label="Abrir menú de usuario"
            >
              {displayInitials}
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
