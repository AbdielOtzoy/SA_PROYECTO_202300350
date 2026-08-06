'use client';
import { AppShell } from '../../components/AppShell';
import { Icon } from '../../components/Icon';

export default function Courses() {
  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">PERFIL ACADÉMICO</p>
        <h1>Mis cursos inscritos</h1>
        <p>Esta sección estará disponible cuando se habilite la asignación de cursos.</p>
      </section>
      <section className="empty-state panel">
        <Icon name="book" size={38} />
        <h2>No hay cursos asignados</h2>
        <p>Los cursos aparecerán aquí cuando esta función esté disponible.</p>
      </section>
    </AppShell>
  );
}
