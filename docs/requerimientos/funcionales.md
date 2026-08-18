# Autenticación

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-001 | Cuando una persona proporcione un correo institucional válido y los datos obligatorios, el sistema deberá registrar su cuenta. | Alta |
| RF-002 | Cuando un usuario proporcione credenciales válidas o complete un flujo OAuth autorizado, el sistema deberá autenticarlo. | Alta |
| RF-003 | Cuando un usuario solicite recuperar su acceso, el sistema deberá enviar al correo asociado un mecanismo de recuperación de contraseña. | Media |
| RF-004 | Cuando un usuario actualice sus preferencias, el sistema deberá permitirle habilitar o deshabilitar los correos de nuevas clases y avisos administrativos sin permitirle deshabilitar los correos de seguridad ni de recuperación. | Media |
| RF-005 | Cuando ocurra un evento de seguridad asociado con una cuenta, el sistema deberá enviar un aviso obligatorio al correo institucional registrado. | Alta |

# Roles e inscripciones

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-006 | Cuando una cuenta tenga varios roles asignados, el sistema deberá acumular los permisos de todos esos roles sin exigir un cambio de perfil. | Alta |
| RF-007 | Cuando un administrador gestione una cuenta, el sistema deberá permitirle asignar o revocar manualmente sus roles. | Media |
| RF-008 | Cuando un usuario consulte sus inscripciones, el sistema deberá mostrar sus cursos y permitir filtrarlos por semestre, estado y credenciales académicas. | Alta |

# Catálogo y contenido

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-009 | Cuando un usuario autenticado explore el catálogo, el sistema deberá permitirle consultar todas las grabaciones publicadas y filtrarlas por atributos académicos. | Alta |
| RF-010 | Cuando un usuario seleccione una grabación del catálogo, el sistema deberá mostrar su ficha detallada. | Alta |
| RF-011 | Cuando un docente o auxiliar gestione uno de sus cursos, el sistema deberá permitirle cargar y publicar sus grabaciones. | Alta |
| RF-012 | Cuando un administrador gestione el contenido, el sistema deberá darle acceso a las grabaciones de todos los cursos. | Alta |

# Reproducción

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-013 | Cuando un usuario autenticado seleccione una grabación publicada del catálogo, el sistema deberá transmitir su video mediante streaming. | Alta |
| RF-014 | Mientras un usuario reproduzca un video, el sistema deberá guardar su posición cada 10 segundos y al pausar o finalizar la reproducción. | Alta |
| RF-015 | Cuando un usuario reanude un video con progreso guardado, el sistema deberá iniciar la reproducción en la posición exacta registrada. | Alta |
| RF-016 | Cuando un usuario consulte su historial, el sistema deberá mostrar sus 20 clases reproducidas más recientemente. | Alta |

# Valoraciones

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-017 | Cuando un usuario valore una grabación, el sistema deberá registrar un único voto positivo o negativo y permitir que el mismo usuario lo modifique. | Alta |
| RF-018 | Cuando se consulte la valoración de una grabación, el sistema deberá calcular el porcentaje como la cantidad de votos positivos dividida entre la cantidad total de votos. | Alta |

# Analítica

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-019 | Cuando se consulte la analítica semanal, el sistema deberá presentar las clases con mayor cantidad de visualizaciones de la semana. | Alta |
| RF-020 | Cuando un administrador gestione el calendario de exámenes, el sistema deberá permitirle configurar el inicio y el fin de cada periodo de examen. | Media |
| RF-021 | Durante un periodo de examen configurado, el sistema deberá identificar los temas en tendencia de ese periodo. | Alta |
| RF-022 | Cuando se consulte el ranking de grabaciones, el sistema deberá ordenarlas según su porcentaje de votos positivos. | Alta |
| RF-023 | Cuando un usuario solicite recomendaciones, el sistema deberá generarlas a partir de sus inscripciones, historial de reproducción y votos. | Alta |

# Carga CSV

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-024 | Cuando un administrador cargue un archivo CSV de catálogo válido, el sistema deberá importar los registros del catálogo contenidos en ese archivo. | Alta |
| RF-025 | Cuando un administrador cargue un archivo CSV de grabaciones válido, el sistema deberá importar los registros de grabaciones contenidos en ese archivo. | Alta |
| RF-026 | Cuando un administrador cargue un archivo CSV de inscripciones válido, el sistema deberá asignar las inscripciones contenidas en ese archivo. | Alta |

# Notificaciones

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-027 | Cuando se complete el registro de una cuenta, el sistema deberá enviar una confirmación al correo institucional registrado. | Alta |
| RF-028 | Cuando se publique una nueva clase, el sistema deberá notificar por correo a los usuarios inscritos en el curso que tengan habilitada esa preferencia. | Alta |
| RF-029 | Cuando un administrador emita un aviso, el sistema deberá enviarlo por correo a los usuarios del rol o curso seleccionado que tengan habilitada esa preferencia. | Alta |

## Trazabilidad P4

RF-003, RF-004, RF-005 y RF-027–RF-029 se implementan mediante los contratos gRPC de Identidad y Notificaciones, las rutas del Gateway de recuperación, preferencias y avisos administrativos, y el worker que procesa `email_queue`. La publicación de una grabación se integra con Identidad para resolver inscritos y con Notificaciones para aplicar `new_recording`.
