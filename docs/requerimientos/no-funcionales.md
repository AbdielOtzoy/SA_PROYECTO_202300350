# Capacidad y rendimiento

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-001 | El sistema deberá soportar al menos 500 usuarios concurrentes. | Alta |
| RNF-002 | Bajo una carga de hasta 500 usuarios concurrentes, el sistema deberá completar al menos el 95 % de las solicitudes de autenticación, catálogo, búsqueda y consulta normal en un máximo de 3 segundos. | Alta |

# Disponibilidad

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-003 | En el entorno de nube, el sistema deberá alcanzar una disponibilidad mensual mínima del 99 %. | Alta |

# Caché

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-004 | El sistema deberá conservar en caché los datos del catálogo durante un máximo de 15 minutos. | Alta |
| RNF-005 | El sistema deberá conservar en caché los datos de tendencias durante un máximo de 5 minutos. | Alta |

# Entrega de correo

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-006 | Cuando se genere un correo automático, el sistema deberá enviarlo en un máximo de 5 minutos. | Alta |

# Seguridad

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-007 | Después de 60 minutos de inactividad, el sistema deberá invalidar la sesión web del usuario. | Alta |
| RNF-008 | El sistema deberá configurar las cookies de sesión web con los atributos `HttpOnly` y `Secure`. | Alta |
| RNF-009 | El servicio de Identidad deberá almacenar las contraseñas mediante un algoritmo criptográfico de hash con sal y resistencia configurable al cómputo. | Alta |
| RNF-010 | Los servicios internos deberán usar JWT para autenticar y autorizar sus comunicaciones. | Alta |
| RNF-011 | El sistema deberá obtener todos sus secretos exclusivamente de variables definidas en archivos `.env`. | Alta |

# Arquitectura

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-012 | La solución deberá estar compuesta por un Gateway y los microservicios de Identidad, Catálogo, Reproducción, Analítica y Notificaciones. | Alta |
| RNF-013 | El Gateway y los servicios de Identidad, Catálogo y Notificaciones deberán implementarse en TypeScript. | Alta |
| RNF-014 | El servicio de Reproducción deberá implementarse en Go. | Alta |
| RNF-015 | El servicio de Analítica deberá implementarse en Python. | Alta |

# Persistencia

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-016 | La solución deberá aplicar el patrón Database per Microservice sin asignar una base de datos al Gateway. | Alta |
| RNF-017 | Los servicios de Identidad, Catálogo y Notificaciones deberán utilizar instancias independientes de PostgreSQL. | Alta |
| RNF-018 | Los servicios de Reproducción y Analítica deberán utilizar instancias independientes de MongoDB. | Alta |
| RNF-019 | El servicio de Analítica deberá disponer de una instancia de Redis no compartida con otros servicios. | Alta |

# Comunicación

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-020 | El Gateway deberá ser el único componente que exponga una interfaz REST con mensajes JSON a los clientes. | Alta |
| RNF-021 | Los componentes internos deberán comunicarse exclusivamente mediante gRPC sobre HTTP/2 con mensajes definidos en Protocol Buffers. | Alta |

# Lógica de datos

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-022 | Las asignaciones de roles e inscripciones en PostgreSQL deberán ejecutarse mediante procedimientos almacenados. | Alta |
| RNF-023 | Las consultas del catálogo y de las fichas detalladas en PostgreSQL deberán utilizar vistas. | Alta |
| RNF-024 | El cálculo de recomendaciones basado en datos de PostgreSQL deberá ejecutarse mediante funciones almacenadas. | Alta |
| RNF-025 | Los cambios de credenciales y roles en PostgreSQL deberán registrarse mediante triggers de auditoría. | Alta |

# Almacenamiento de videos

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-026 | En el entorno local, el sistema deberá almacenar los videos en un volumen persistente. | Alta |
| RNF-027 | En el entorno de nube, el sistema deberá almacenar los videos en Google Cloud Storage. | Alta |

# Despliegue y calidad

| ID | Requerimiento | Prioridad |
|---|---|---|
| RNF-028 | Cada componente desplegable deberá incluir un Dockerfile que permita construir su imagen. | Alta |
| RNF-029 | La solución deberá incluir un archivo Docker Compose para el entorno de desarrollo y otro para el entorno de producción. | Alta |
| RNF-030 | La solución de nube deberá poder desplegarse en Google Cloud Platform. | Alta |
| RNF-031 | El código fuente deberá aplicar los principios SOLID. | Alta |
| RNF-032 | El repositorio deberá ejecutar mediante integración continua las compilaciones y pruebas automatizadas en cada cambio propuesto. | Alta |
| RNF-033 | El repositorio deberá ejecutar mediante entrega continua el despliegue automatizado de los cambios aprobados. | Alta |
| RNF-034 | Todo cambio que se integre en la rama principal de GitHub deberá aprobarse mediante un pull request. | Alta |

## Evidencia RNF-006

La cola de Notificaciones usa un worker TypeScript que se ejecuta al iniciar y cada 30 segundos, procesa lotes de hasta 100 correos y reintenta fallos con retrasos de 30, 60 y 120 segundos. La validación de P4 mide el tiempo desde `created_at` hasta la entrega al SMTP/Mailpit y exige un máximo de 300 segundos en condiciones normales.
