# Contexto completo de la Práctica 2 según la explicación del tutor

> **Propósito de este archivo**
>
> Este documento concentra las instrucciones, aclaraciones, advertencias y ejemplos dados por el tutor durante la clase relacionada con la **Práctica 2: backend, autenticación y orquestación**.
>
> Debe utilizarse como contexto para revisar el repositorio, detectar inconsistencias y corregirlas antes de la calificación.
>
> **Importante:** la fuente es una transcripción automática y contiene palabras mal reconocidas. Este documento normaliza términos cuando el contexto es suficientemente claro y marca explícitamente los puntos que no pueden asegurarse únicamente con la transcripción.

---

## 1. Instrucciones para el agente de código

Al analizar el proyecto:

1. Trata como **obligatorios** únicamente los requisitos identificados en este documento como tales.
2. No conviertas los ejemplos de e-commerce, AWS, S3, RDS, Redis o distribución en máquinas virtuales en requisitos del proyecto, salvo que coincidan con el enunciado oficial.
3. Compara siempre este documento con:
   - el enunciado oficial de la Práctica 2;
   - los mockups y decisiones de la Práctica 1;
   - la estructura actual del repositorio;
   - la configuración de despliegue y variables de entorno.
4. Cuando encuentres una contradicción entre este documento y el enunciado oficial, **el enunciado oficial tiene prioridad**.
5. No inventes:
   - el dominio institucional exacto;
   - los nombres exactos de los servicios;
   - los puertos;
   - las rutas de callback;
   - la asignación exacta de módulos por lenguaje;
   - la infraestructura final en la nube.
6. Para cada inconsistencia encontrada, reporta:
   - requisito relacionado;
   - evidencia concreta en el repositorio;
   - severidad;
   - posible impacto durante la calificación;
   - corrección recomendada;
   - archivos que deberían modificarse.
7. Separa los hallazgos en:
   - **Bloqueante**: impide cumplir un requisito principal o demostrar el sistema.
   - **Alto**: contradice directamente una instrucción del tutor.
   - **Medio**: puede provocar pérdida de puntos, fallos de demostración o documentación incompleta.
   - **Bajo**: mejora de claridad, mantenibilidad o presentación.

---

## 2. Normalización de términos de la transcripción

La transcripción automática utiliza términos incorrectos o incompletos. En este documento se interpretan de la siguiente manera:

| Transcripción aproximada | Interpretación utilizada |
|---|---|
| `IRPC`, `YRPC`, `PC` | **gRPC**, por el contexto de comunicación entre microservicios y contratos `.proto` |
| `APW`, `API Jetway`, `aperway` | **API Gateway** |
| `Docker Compost`, `dockercos` | **Docker Compose** |
| `Out`, `Bout`, `logout` en el contexto de Google | **OAuth** |
| `Ready`, `Race`, `Ris` | **Redis** |
| `Nest, no Next` | **NestJS**, no Next.js |
| `Fontain` | **Frontend** |
| `Postg` | **PostgreSQL** |
| `BM` | Probablemente **VM**, máquina virtual |
| `mocops` | **Mockups** |
| `P request` | **Pull request** |

Cuando el significado no es suficientemente claro, se conserva la ambigüedad en lugar de completar el requisito por suposición.

---

# 3. Resumen ejecutivo

La Práctica 2 representa el paso desde la planificación y diseño de la primera fase hacia una **implementación web funcional en un entorno local**.

Los elementos principales mencionados por el tutor son:

- arquitectura de microservicios;
- uso obligatorio de tres lenguajes de backend;
- comunicación interna mediante gRPC;
- contratos definidos en archivos `.proto`;
- API Gateway como punto único de entrada;
- autenticación con Google;
- acceso restringido a usuarios institucionales;
- JWT y manejo de sesiones;
- aplicación web conectada al API Gateway;
- Docker y Docker Compose;
- persistencia y objetos de base de datos;
- aplicación de los cinco principios SOLID;
- documentación técnica en Markdown;
- trabajo mediante pull requests;
- creación del tag `0.2.0`.

El tutor indicó que la práctica no necesariamente debía estar funcional al 100 %, pero esperaba un avance considerable porque esta entrega también forma parte del desarrollo progresivo del proyecto.

---

# 4. Alcance general obligatorio

## 4.1 Implementación funcional en entorno local

La fase debe trasladar la arquitectura propuesta en la Práctica 1 hacia una implementación web funcional en un entorno local.

Esto implica que no basta con entregar únicamente:

- diagramas;
- mockups;
- código aislado;
- contenedores que no se comunican;
- endpoints sin integración;
- servicios que solo funcionan de manera individual.

Debe existir una integración demostrable entre el frontend, el API Gateway, la autenticación y los servicios incluidos en el alcance de esta fase.

**Referencia temporal en la clase:** aproximadamente `13:47–14:03`.

---

## 4.2 Arquitectura de microservicios

El tutor leyó como requisito una arquitectura basada en microservicios.

El proyecto debe reflejar desacoplamiento entre servicios y una arquitectura políglota. La separación debe ser real, no solamente carpetas distintas dentro de una aplicación monolítica.

El agente debe revisar:

- procesos ejecutables independientes;
- responsabilidades claramente separadas;
- contratos explícitos;
- dependencias entre servicios;
- bases de datos o esquemas asignados según la arquitectura;
- contenedores independientes cuando corresponda;
- ausencia de importaciones directas que acoplen internamente dos servicios;
- ausencia de acceso directo a la base de datos de otro servicio, salvo que el enunciado lo permita expresamente.

---

## 4.3 Tres lenguajes de backend

El tutor indicó que deben utilizarse **obligatoriamente tres lenguajes de backend**.

Durante el ejemplo se mencionaron:

- TypeScript;
- Python;
- Go.

Sin embargo, la transcripción no conserva con suficiente claridad la asignación exacta de módulos a cada lenguaje cuando el tutor leyó los entregables. Por lo tanto:

> **No debe inferirse la asignación definitiva de módulos por lenguaje desde esta transcripción. Debe verificarse directamente en el enunciado oficial.**

El agente sí debe comprobar que:

- los tres lenguajes exigidos realmente estén presentes;
- no existan servicios ficticios o vacíos únicamente para afirmar que se usó un lenguaje;
- cada servicio pueda ejecutarse;
- los servicios participen en el flujo funcional;
- la documentación indique qué servicio está construido con cada lenguaje.

---

# 5. Comunicación entre componentes

## 5.1 Frontend hacia backend

El tutor aclaró que desde el frontend hacia el backend **sí se permite REST**.

El flujo esperado es:

```text
Navegador
   ↓
Frontend
   ↓ REST
API Gateway
   ↓
Microservicios
```

El frontend no debería saltarse el API Gateway para comunicarse directamente con varios microservicios.

### Validaciones para el agente

Buscar:

- URLs directas desde el frontend hacia servicios internos;
- múltiples variables como `AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, etc. utilizadas directamente en el frontend;
- llamadas `fetch`, `axios` o equivalentes que eviten el gateway;
- reglas CORS configuradas individualmente en todos los servicios para consumo directo desde el navegador.

Si el frontend consume directamente un microservicio interno, reportarlo como inconsistencia de severidad alta.

---

## 5.2 Comunicación entre microservicios

La comunicación entre microservicios debe realizarse mediante **gRPC**.

El tutor fue explícito al diferenciar:

- frontend a backend: REST permitido;
- microservicio a microservicio: gRPC;
- contratos: archivos `.proto`.

### No debe aceptarse como equivalente

- REST entre servicios;
- GraphQL entre servicios;
- llamadas HTTP directas;
- importar código de otro servicio;
- conectarse directamente a la base de datos de otro servicio para evitar una llamada;
- simular gRPC manteniendo `.proto` sin utilizarlos en ejecución.

### Validaciones para el agente

Comprobar:

- existencia de archivos `.proto`;
- generación o carga real de los contratos;
- servidores gRPC levantados;
- clientes gRPC configurados;
- direcciones y puertos configurables por variables de entorno;
- manejo de errores y timeouts;
- correspondencia entre mensajes `.proto` y código utilizado;
- ausencia de rutas REST internas utilizadas para comunicación entre servicios.

**Referencia temporal:** aproximadamente `19:47–20:05`.

---

## 5.3 El API Gateway cuenta como un servicio

Durante el ejemplo, el tutor aclaró que el API Gateway debe contarse como un servicio más, aunque su función principal sea enrutar solicitudes.

El API Gateway debe aparecer en:

- arquitectura de alto nivel;
- diagrama de despliegue;
- Docker Compose;
- documentación técnica;
- flujo de autenticación;
- configuración de red y puertos.

No debe representarse como una simple flecha o como una función invisible dentro del frontend.

**Referencia temporal:** aproximadamente `52:31–52:47`.

---

# 6. API Gateway

El API Gateway funciona como punto único de entrada.

Debe encargarse, según lo explicado, de:

- recibir solicitudes del frontend;
- validar tokens;
- aplicar la restricción institucional;
- enrutar hacia los servicios correspondientes;
- impedir que el cliente conozca o consuma directamente los servicios internos.

## Revisiones mínimas

El agente debe comprobar:

- validación de JWT;
- tratamiento de token ausente, inválido o expirado;
- rutas públicas y protegidas;
- comunicación interna por gRPC;
- variables de entorno para direcciones internas;
- respuestas consistentes de error;
- ausencia de secretos hardcodeados;
- configuración dentro de Docker Compose;
- dependencia saludable respecto a servicios internos;
- que el gateway no contenga toda la lógica de negocio de los microservicios.

---

# 7. Autenticación institucional con Google

## 7.1 Google OAuth

La fase incluye autenticación con Google.

Durante la clase, el tutor mostró un flujo general en Google Cloud:

1. Crear o seleccionar un proyecto.
2. Ir a **APIs y servicios**.
3. Configurar la pantalla de consentimiento de OAuth.
4. Definir el nombre de la aplicación y correo de asistencia.
5. Seleccionar el tipo de usuarios.
6. Crear un cliente OAuth.
7. Elegir el tipo **Aplicación web**.
8. Configurar los orígenes o dominios autorizados.
9. Configurar las URL de redireccionamiento.
10. Obtener:
    - Client ID;
    - Client Secret;
    - URL o ruta de redireccionamiento/callback.
11. Descargar el archivo JSON de credenciales como respaldo.

---

## 7.2 Solo usuarios institucionales

El login debe restringirse a correos institucionales de la Facultad de Ingeniería.

El tutor explicó que, en la pantalla de consentimiento, seleccionar usuarios **externos** permitiría iniciar sesión con cualquier cuenta de Google. Indicó seleccionar la opción **interna** para limitar el acceso a usuarios de la organización.

### El agente debe detectar

- configuración que permita cualquier cuenta de Google;
- validación basada únicamente en que el texto del correo “parezca” institucional;
- ausencia de validación del dominio en el backend o gateway;
- autenticación realizada únicamente en el frontend;
- generación de JWT sin validar previamente la identidad;
- endpoints protegidos accesibles sin token;
- tokens aceptados sin verificar emisor, audiencia o expiración;
- dominio institucional hardcodeado en múltiples archivos sin configuración central;
- mensajes de error que expongan datos sensibles.

### Dato que no aparece con claridad

La transcripción no indica el dominio institucional exacto que debe aceptarse.

> El agente no debe inventarlo. Debe obtenerlo del enunciado oficial, la configuración existente o una decisión explícita del equipo.

---

## 7.3 JWT y sesiones

El tutor mencionó:

- JWT;
- gestión de sesiones seguras;
- persistencia con algo que la transcripción reconoce como “objetos renovables”.

Por el contexto, esta última frase podría referirse a **tokens renovables o refresh tokens**, pero la transcripción no permite afirmarlo con certeza.

### Regla para el agente

- Verificar el enunciado oficial antes de asumir que los refresh tokens son obligatorios.
- Sí considerar obligatorio el uso de JWT porque fue mencionado claramente.
- No declarar cumplimiento únicamente porque exista una librería JWT instalada.
- Comprobar que el token se emita, valide y use en las rutas protegidas.

---

# 8. Dominio local y callback de OAuth

## 8.1 Lo que explicó el tutor

El tutor indicó que, mientras el proyecto se ejecuta localmente, debía agregarse un dominio a la computadora.

Mencionó que el archivo correspondiente se encontraba dentro de `System32`, lo cual apunta al archivo `hosts` de Windows.

También explicó que ese dominio debía configurarse en el cliente OAuth y utilizarse dentro de la URL de redireccionamiento.

Ejemplo conceptual:

```text
http(s)://dominio-local[:puerto]/ruta/callback
```

La ruta exacta, dominio y puerto dependen del proyecto.

El tutor recalcó:

- el dominio debe estar configurado en la computadora;
- la URL autorizada debe coincidir;
- el callback debe incluir correctamente dominio, puerto y ruta cuando corresponda;
- una configuración incorrecta impedirá que OAuth funcione.

**Referencia temporal:** aproximadamente `1:39:19–1:44:34`.

---

## 8.2 Sobre ngrok

El tutor **no mencionó ngrok** en la clase.

Por lo tanto:

- ngrok no debe tratarse como requisito;
- ngrok no debe presentarse como si fuera exactamente el “dominio local” explicado por el tutor;
- si el proyecto lo utiliza, debe documentarse como un túnel o URL pública hacia el entorno local;
- el agente debe marcar como pendiente de validación si ngrok sustituye totalmente la configuración esperada por el tutor;
- no debe cambiarse automáticamente una configuración funcional de dominio local por ngrok sin una decisión explícita.

---

## 8.3 Riesgos de demostración

Antes de la calificación, verificar:

- que el dominio resuelva en la computadora usada para demostrar;
- que el frontend se abra desde el mismo origen registrado;
- que el callback coincida exactamente;
- que el puerto no cambie al reiniciar;
- que Google redirija hacia la ruta implementada;
- que el gateway procese el callback;
- que el usuario institucional pueda entrar;
- que una cuenta personal sea rechazada;
- que los secretos estén disponibles en el entorno;
- que el flujo funcione desde cero y no únicamente gracias a una sesión previamente almacenada.

---

# 9. Tecnologías y herramientas prohibidas

El tutor indicó que no están permitidos:

- Supabase;
- Firebase;
- ORM abstractos como Prisma.

## Validaciones para el agente

Buscar en:

- `package.json`;
- archivos de configuración;
- variables de entorno;
- imports;
- clientes SDK;
- migraciones;
- documentación;
- Dockerfiles;
- historial de código activo.

Patrones útiles:

```text
prisma
@prisma/client
firebase
firebase-admin
supabase
@supabase
```

No basta con que la dependencia esté “sin usar”: si forma parte de la solución entregada o de la persistencia, debe reportarse.

Si existe una dependencia residual no utilizada, marcarla como riesgo y recomendar retirarla para evitar dudas durante la revisión.

**Referencia temporal:** aproximadamente `15:03–15:19`.

---

# 10. Frameworks mencionados

## 10.1 TypeScript

El tutor indicó expresamente:

> Para los servicios realizados con TypeScript, utilicen Nest, no Next.

La razón explicada fue que NestJS está diseñado para trabajar con microservicios.

Esto debe interpretarse como una instrucción fuerte para los servicios TypeScript.

### El agente debe revisar

- que los servicios TypeScript usen NestJS;
- que no se haya confundido NestJS con Next.js;
- que el API Gateway y los servicios TypeScript estén estructurados correctamente;
- que la integración gRPC utilice las capacidades del framework o una implementación equivalente coherente;
- que no sea un proyecto Express presentado como NestJS.

**Referencia temporal:** aproximadamente `1:09:37–1:10:21`.

---

## 10.2 Python

El tutor indicó que no tenía una recomendación obligatoria para Python.

Durante el ejemplo mencionó FastAPI, pero no lo estableció como requisito.

Por lo tanto:

- FastAPI es una opción válida según el ejemplo;
- no debe marcarse otro framework Python como incorrecto únicamente por no ser FastAPI;
- sí debe comprobarse que el servicio cumpla gRPC, contenedorización y separación de responsabilidades.

---

## 10.3 Go

Durante el ejemplo mencionó Gin para Go.

No quedó establecido como framework obligatorio.

No marcar como inconsistencia el uso de otro framework o de la biblioteca estándar, salvo que el enunciado oficial diga lo contrario.

---

# 11. Docker y Docker Compose

## 11.1 Diferencia explicada por el tutor

El tutor explicó:

- **Docker** crea o ejecuta los contenedores;
- **Docker Compose** coordina u orquesta los contenedores y sus instrucciones.

El sistema debe poder levantarse mediante **un único comando** de Docker Compose.

Ejemplo esperado:

```bash
docker compose up --build
```

El comando exacto puede variar, pero no debería requerir levantar manualmente cada servicio en terminales separadas.

---

## 11.2 Componentes que deben revisarse

El agente debe inspeccionar:

- `compose.yaml`, `compose.yml` o `docker-compose.yml`;
- Dockerfile de cada servicio;
- Dockerfile del frontend si forma parte del entorno local;
- redes;
- volúmenes;
- puertos;
- variables de entorno;
- healthchecks;
- dependencias de inicio;
- persistencia de base de datos;
- generación o disponibilidad de archivos `.proto`;
- acceso entre servicios por nombre DNS de Compose, no por `localhost`;
- exclusión de secretos del repositorio.

---

## 11.3 Todo el sistema con un único comando

Reportar como inconsistencia si:

- el frontend se inicia manualmente fuera de Compose sin justificación;
- la base de datos debe crearse manualmente;
- se deben ejecutar migraciones no documentadas antes de levantar;
- los `.proto` deben copiarse manualmente;
- un servicio depende de una IP fija local;
- se deben modificar archivos después de ejecutar Compose;
- se necesitan múltiples comandos no documentados para obtener un sistema funcional.

---

## 11.4 Contenedores de bases de datos

El tutor aclaró una decisión pragmática:

- idealmente cada base de datos podría estar en un contenedor separado;
- por limitaciones de recursos y créditos, recomendó utilizar un solo contenedor de base de datos.

Esto no significa necesariamente compartir una única base lógica sin separación. Puede existir:

- un solo servidor PostgreSQL;
- varias bases de datos o esquemas, según la arquitectura.

El agente debe comparar esta decisión con el enunciado y con la implementación actual.

**Referencia temporal:** aproximadamente `1:13:50–1:14:30`.

---

# 12. Persistencia y objetos de base de datos

Entre los entregables leídos por el tutor se mencionaron:

- tablas;
- procedimientos almacenados;
- vistas;
- triggers;
- funciones.

La transcripción de algunos términos es imperfecta, pero el conjunto corresponde claramente a objetos SQL.

## El agente debe comprobar

- scripts reproducibles;
- orden correcto de ejecución;
- existencia de migraciones o scripts de inicialización;
- relaciones, llaves y restricciones;
- procedimientos almacenados requeridos;
- vistas requeridas;
- triggers requeridos;
- funciones requeridas;
- integración de los scripts con Docker;
- ausencia de configuración manual no documentada;
- persistencia después de reiniciar contenedores, si corresponde.

No debe asumirse que cada microservicio necesita obligatoriamente una base de datos. Durante el ejemplo, el tutor explicó que un servicio de integración con sistemas externos podría no requerirla.

---

# 13. Principios SOLID

El tutor mostró material sobre los cinco principios SOLID y solicitó una matriz explicando cómo fueron aplicados.

Los principios tratados fueron:

1. **S — Responsabilidad única**
2. **O — Abierto/cerrado**
3. **L — Sustitución de Liskov**
4. **I — Segregación de interfaces**
5. **D — Inversión de dependencias**

## 13.1 La matriz no debe ser únicamente teórica

Debe relacionar cada principio con evidencia concreta del proyecto.

Formato sugerido:

| Principio | Módulo o archivo | Decisión aplicada | Evidencia | Beneficio |
|---|---|---|---|---|
| SRP | `ruta/al/archivo` | ... | ... | ... |
| OCP | `ruta/al/archivo` | ... | ... | ... |
| LSP | `ruta/al/archivo` | ... | ... | ... |
| ISP | `ruta/al/archivo` | ... | ... | ... |
| DIP | `ruta/al/archivo` | ... | ... | ... |

## 13.2 Validaciones para el agente

Detectar:

- clases o módulos con demasiadas responsabilidades;
- lógica de negocio mezclada con infraestructura;
- dependencias concretas instanciadas directamente;
- interfaces demasiado grandes;
- implementaciones que no respetan contratos;
- código condicional rígido que obliga a modificar componentes centrales para extenderlos;
- una matriz que mencione principios sin evidencia verificable.

---

# 14. Frontend

El frontend debe:

- ser una aplicación funcional;
- conectarse al API Gateway;
- respetar los mockups de la Práctica 1;
- integrarse con la autenticación;
- enviar el JWT cuando corresponda;
- manejar errores de autenticación;
- no comunicarse directamente con servicios internos.

Durante el ejemplo de arquitectura de alto nivel, el tutor mencionó un frontend construido con tecnologías web y dockerizado, pero el nombre exacto de las tecnologías no es un requisito confiable de la transcripción.

El agente debe utilizar el enunciado oficial para verificar el stack requerido.

---

# 15. Diagramas y documentación de arquitectura

El tutor señaló que durante las primeras calificaciones encontró varios errores, principalmente en los diagramas de despliegue.

Esta fue una de las advertencias más importantes de la clase.

---

## 15.1 Diagrama de arquitectura de alto nivel

Debe mostrar al menos:

- cliente o navegador;
- frontend;
- API Gateway;
- microservicios;
- bases de datos relacionadas;
- servicios externos;
- flujo general de comunicación;
- lenguaje de cada servicio;
- framework utilizado, cuando corresponda;
- tecnología de orquestación.

El tutor pidió expresamente colocar el lenguaje con el que está construido cada servicio.

También sugirió incluir el framework.

### Evitar

- cajas genéricas sin tecnología;
- servicios sin nombre;
- flechas sin dirección;
- bases de datos compartidas sin explicación;
- API Gateway omitido;
- frontend conectado directamente a todos los servicios;
- mezclar arquitectura lógica y despliegue sin distinguirlas.

---

## 15.2 Diagrama de despliegue

El tutor espera más detalle que una lista de servicios.

Debe representar, según corresponda:

- hardware o dispositivo cliente;
- nodos de ejecución;
- proveedor de nube o entorno local;
- servicios concretos de infraestructura;
- máquinas virtuales o servidores;
- contenedores;
- componentes dentro de cada contenedor o nodo;
- Docker;
- Docker Compose;
- bases de datos;
- caché;
- servicios externos;
- protocolos de comunicación;
- puertos;
- qué elementos están contenedorizados y cuáles no.

### El tutor indicó que deben mostrarse

- la nube utilizada;
- los servicios de nube utilizados;
- el orquestador;
- los componentes;
- si cada elemento es o no un contenedor;
- protocolos;
- puertos.

**Referencia temporal:** aproximadamente `1:31:44–1:35:47`.

---

## 15.3 Protocolos en el diagrama

Las conexiones deben estar etiquetadas.

Ejemplo:

```text
Frontend ── REST/HTTPS ──> API Gateway
API Gateway ── gRPC :puerto ──> Servicio A
Servicio A ── TCP :puerto ──> PostgreSQL
Servicio B ── gRPC :puerto ──> Servicio C
```

El tutor mencionó puertos en el rango de `50000` durante el ejemplo de gRPC, pero no estableció números obligatorios.

> Los números de puerto del ejemplo no deben copiarse automáticamente. Deben reflejar la configuración real del proyecto.

---

# 16. Ejemplo hipotético utilizado por el tutor

El tutor construyó un ejemplo de e-commerce para explicar diagramas.

Mencionó posibles servicios como:

- autenticación;
- catálogo;
- cambio de divisa;
- órdenes;
- pago;
- integración con catálogos externos;
- cupones;
- tracking o estado de pedido.

Distribuyó hipotéticamente servicios entre:

- TypeScript;
- Python;
- Go.

También mencionó:

- Redis como caché para cambio de divisa;
- un servicio externo;
- AWS;
- S3;
- máquinas virtuales;
- RDS;
- PostgreSQL;
- varios contenedores.

## Regla crítica

> Este ejemplo tenía propósito didáctico. No demuestra que el proyecto real deba tener esos mismos servicios, esa nube o esa distribución.

El agente no debe crear servicios de:

- divisas;
- cupones;
- pagos;
- tracking;
- integración externa;

a menos que estén en el enunciado o arquitectura real del equipo.

---

# 17. Servicios y bases de datos

Durante el ejemplo, el tutor comentó que cada servicio puede tener su base de datos, pero aclaró que no todos necesariamente necesitan persistencia.

Ejemplo:

- un servicio que solo integra una API externa podría no tener base de datos;
- un servicio de divisas podría usar Redis como caché;
- servicios de negocio como órdenes podrían tener su propia base.

Esto debe entenderse como orientación arquitectónica, no como una lista obligatoria.

El agente debe detectar:

- acceso de un servicio a tablas pertenecientes a otro;
- una base compartida sin límites claros;
- duplicación de responsabilidades;
- persistencia innecesaria;
- falta de persistencia donde el dominio sí lo requiere;
- credenciales de base de datos hardcodeadas;
- ausencia de inicialización reproducible.

---

# 18. Informe técnico en Markdown

El tutor indicó como entregable nuevo un documento `.md` que detalle la arquitectura implementada.

Debe incluir como mínimo:

1. descripción general;
2. alcance de la fase;
3. arquitectura de alto nivel;
4. servicios;
5. lenguaje y framework de cada servicio;
6. API Gateway;
7. comunicación REST y gRPC;
8. contratos `.proto`;
9. autenticación con Google;
10. validación institucional;
11. JWT y sesiones;
12. persistencia;
13. Docker y Docker Compose;
14. instrucciones para ejecutar;
15. variables de entorno requeridas;
16. diagramas;
17. matriz SOLID;
18. decisiones y limitaciones;
19. pruebas o pasos de demostración;
20. problemas conocidos, si existen.

El documento no debe describir una arquitectura ideal distinta a la implementada.

El agente debe comparar el Markdown con el código y reportar inconsistencias como:

- servicio documentado que no existe;
- puerto diferente;
- lenguaje incorrecto;
- diagrama desactualizado;
- flujo OAuth diferente;
- variable de entorno faltante;
- comando de inicio que no funciona;
- módulo declarado como completo pero no integrado.

---

# 19. Git, integración y versión

El tutor indicó:

- continuar trabajando mediante pull requests;
- crear el tag `0.2.0`.

## Validaciones

Comprobar:

```bash
git tag --list
git show 0.2.0
git log --oneline --decorate --graph --all
```

También revisar:

- que el tag apunte a la versión entregada;
- que no se haya creado antes de integrar cambios;
- que el repositorio remoto contenga el tag;
- que exista evidencia de integración mediante pull requests;
- que la rama entregada corresponda a la versión demostrada;
- que no haya cambios críticos sin commit.

> La existencia real de pull requests puede requerir revisar la plataforma remota; no siempre puede confirmarse únicamente con el repositorio local.

---

# 20. Fechas y revisión

Según la clase:

- entrega: **5 de agosto**;
- calificación: **6 y 8 de agosto**.

Estas fechas corresponden a la explicación registrada y deben compararse con la plataforma oficial por si hubo cambios posteriores.

---

# 21. Estado funcional esperado

El tutor dijo que entregaran lo que pudieran y que no necesariamente debía estar funcional al 100 %.

Sin embargo:

- espera un avance importante;
- las prácticas están deliberadamente cargadas para evitar que el proyecto llegue incompleto al final;
- fue estricto respecto al nivel de avance;
- indicó que no “jala 61”, es decir, no debe asumirse un redondeo para alcanzar la nota mínima.

La transcripción pierde palabras justo cuando menciona una parte que revisaría “bastante”, por lo que no puede determinarse con certeza cuál componente enfatizó en esa frase.

## Interpretación segura

Priorizar primero los requisitos estructurales:

1. autenticación;
2. restricción institucional;
3. API Gateway;
4. JWT;
5. comunicación gRPC;
6. archivos `.proto`;
7. Docker Compose;
8. integración funcional;
9. documentación;
10. diagramas;
11. persistencia requerida;
12. tag y proceso de integración.

---

# 22. DTT y horarios de calificación

El tutor pidió comprobar que todos estuvieran asignados en DTT.

Indicó que los avisos se enviarían por ese medio porque los avisos de otra plataforma no siempre llegaban.

Sobre los horarios:

- los espacios eran limitados;
- debían anotarse responsablemente;
- si alguien no podía asistir, debía retirarse y justificar por correo;
- los horarios del sábado requerirían formulario, justificación y evidencia;
- el sábado se reservaría principalmente para quienes realmente no podían entre semana;
- simplemente faltar sin avisar podía afectar la oportunidad de revisión.

Esto no cambia el código, pero sí afecta el proceso de calificación.

---

# 23. Checklist técnico para detectar inconsistencias

## 23.1 Arquitectura

- [ ] Existen microservicios reales e independientes.
- [ ] Se utilizan los tres lenguajes exigidos.
- [ ] La asignación por lenguaje coincide con el enunciado oficial.
- [ ] El API Gateway está implementado.
- [ ] El API Gateway aparece en los diagramas.
- [ ] El frontend solo consume el gateway.
- [ ] No existe acceso directo entre frontend y servicios internos.
- [ ] Las responsabilidades están separadas.

## 23.2 Comunicación

- [ ] Frontend a gateway utiliza REST/HTTP según corresponda.
- [ ] Servicio a servicio utiliza gRPC.
- [ ] Existen archivos `.proto`.
- [ ] Los `.proto` se utilizan realmente.
- [ ] Los puertos son configurables.
- [ ] Los diagramas indican protocolos y puertos.
- [ ] No existen endpoints REST internos usados para evitar gRPC.

## 23.3 Autenticación

- [ ] Existe Google OAuth.
- [ ] Solo se aceptan usuarios institucionales.
- [ ] La restricción no depende únicamente del frontend.
- [ ] El backend o gateway valida la identidad.
- [ ] Existe JWT.
- [ ] Las rutas protegidas validan JWT.
- [ ] El callback coincide con Google Cloud.
- [ ] El dominio local está configurado o existe una decisión documentada equivalente.
- [ ] Una cuenta no institucional es rechazada.
- [ ] Los secretos no están versionados.

## 23.4 TypeScript

- [ ] Los servicios TypeScript usan NestJS.
- [ ] No se confundió NestJS con Next.js.
- [ ] El soporte gRPC está integrado.
- [ ] La lógica de negocio no está concentrada en el gateway.

## 23.5 Docker

- [ ] Existe Dockerfile por componente necesario.
- [ ] Existe archivo Compose.
- [ ] Todo se levanta con un único comando.
- [ ] Los servicios se comunican usando nombres de red internos.
- [ ] No usan `localhost` para comunicarse entre contenedores.
- [ ] Existen volúmenes cuando la persistencia lo requiere.
- [ ] La inicialización de base de datos es automática.
- [ ] Las variables de entorno están documentadas.
- [ ] No hay pasos manuales ocultos.

## 23.6 Persistencia

- [ ] Existen tablas requeridas.
- [ ] Existen procedimientos almacenados requeridos.
- [ ] Existen vistas requeridas.
- [ ] Existen triggers requeridos.
- [ ] Existen funciones requeridas.
- [ ] Los scripts son reproducibles.
- [ ] La base de datos se inicializa desde cero.
- [ ] No se utiliza Prisma.
- [ ] No se utiliza Firebase.
- [ ] No se utiliza Supabase.

## 23.7 Documentación

- [ ] Existe informe técnico `.md`.
- [ ] Describe la arquitectura realmente implementada.
- [ ] Incluye instrucciones de ejecución.
- [ ] Incluye variables de entorno.
- [ ] Incluye diagramas actualizados.
- [ ] Incluye matriz SOLID con evidencia.
- [ ] Incluye limitaciones conocidas.
- [ ] No presenta ejemplos hipotéticos como implementación real.

## 23.8 Git

- [ ] Se trabajó mediante pull requests.
- [ ] Existe el tag `0.2.0`.
- [ ] El tag apunta al commit correcto.
- [ ] El tag existe en el remoto.
- [ ] No hay cambios críticos sin commit.
- [ ] La rama de entrega coincide con la demostración.

---

# 24. Búsquedas sugeridas dentro del repositorio

El agente puede comenzar con búsquedas equivalentes a:

```bash
# Herramientas prohibidas
grep -RniE "prisma|supabase|firebase" .

# Comunicación HTTP potencial entre servicios
grep -RniE "axios|fetch\(|http://|https://" services apps src .

# Archivos gRPC
find . -type f \( -name "*.proto" -o -iname "*grpc*" \)

# Configuración OAuth/JWT
grep -RniE "google|oauth|client_id|client_secret|callback|redirect|jwt|token" .

# Docker
find . -type f \( -iname "Dockerfile*" -o -iname "*compose*.yml" -o -iname "*compose*.yaml" \)

# NestJS
grep -RniE "@nestjs|NestFactory|ClientsModule|Transport\.GRPC" .

# SQL
find . -type f \( -name "*.sql" -o -iname "*migration*" -o -iname "*schema*" \)

# Secretos potencialmente versionados
grep -RniE "CLIENT_SECRET|JWT_SECRET|PRIVATE_KEY|PASSWORD=" .
```

Las rutas deben adaptarse a la estructura real del proyecto.

---

# 25. Formato esperado para el reporte del agente

El agente debería producir una tabla como:

| Severidad | Requisito | Evidencia | Inconsistencia | Corrección propuesta | Archivos |
|---|---|---|---|---|---|
| Bloqueante | gRPC interno | `archivo:línea` | Servicio A llama por REST a Servicio B | Crear contrato y cliente gRPC | `...` |
| Alto | Restricción institucional | `archivo:línea` | Se acepta cualquier cuenta Google | Validar dominio en backend/gateway | `...` |
| Medio | Diagrama | `docs/...` | No aparecen puertos ni protocolos | Actualizar diagrama | `...` |

Después de la tabla debe incluir:

1. bloqueantes para la demostración;
2. inconsistencias de arquitectura;
3. inconsistencias de seguridad;
4. inconsistencias de documentación;
5. plan de corrección por prioridad;
6. verificaciones manuales que el agente no puede completar;
7. puntos ambiguos que necesitan compararse con el enunciado oficial.

---

# 26. Puntos ambiguos que no deben resolverse por suposición

1. **Asignación exacta de módulos por lenguaje.**
   - La transcripción está dañada en esa parte.
   - Consultar el enunciado oficial.

2. **Dominio institucional exacto.**
   - No aparece claramente.
   - Consultar el enunciado o configuración del curso.

3. **Uso obligatorio de refresh tokens.**
   - La transcripción podría decir “tokens renovables”, pero no es seguro.

4. **Framework obligatorio para Python o Go.**
   - FastAPI y Gin fueron ejemplos, no instrucciones obligatorias claras.

5. **Puertos exactos.**
   - Los puertos alrededor de `50000` fueron parte de un ejemplo.

6. **Proveedor de nube final.**
   - El tutor alternó GCP y AWS dentro de un ejemplo didáctico.
   - No asumir que AWS es obligatorio.

7. **Distribución por máquinas virtuales.**
   - Fue parte del ejemplo de despliegue, no necesariamente de esta fase local.

8. **Redis.**
   - Fue utilizado en el ejemplo de divisas como caché.
   - No es un requisito general demostrado por la transcripción.

9. **Ngrok.**
   - No fue mencionado por el tutor.
   - No asumir que reemplaza automáticamente el dominio local solicitado.

10. **Componente que el tutor dijo que revisaría “bastante”.**
    - La frase está incompleta en la transcripción.

---

# 27. Priorización recomendada antes de la calificación

## Prioridad 1 — Bloqueantes

- flujo de Google OAuth;
- rechazo de cuentas no institucionales;
- validación de JWT;
- API Gateway;
- frontend conectado al gateway;
- gRPC entre servicios;
- contratos `.proto`;
- arranque mediante Docker Compose.

## Prioridad 2 — Requisitos verificables

- tres lenguajes;
- NestJS en TypeScript;
- persistencia;
- objetos SQL;
- ausencia de herramientas prohibidas;
- integración real entre componentes.

## Prioridad 3 — Entrega y documentación

- informe Markdown;
- matriz SOLID;
- diagramas completos;
- instrucciones reproducibles;
- tag `0.2.0`;
- pull requests.

## Prioridad 4 — Presentación

- prueba desde entorno limpio;
- cuenta institucional y no institucional;
- callback;
- puertos;
- logs legibles;
- explicación del flujo;
- evidencia de que no se usa REST entre microservicios.

---

# 28. Guion mínimo de demostración

1. Clonar o preparar el repositorio desde un estado limpio.
2. Configurar las variables de entorno sin modificar código.
3. Levantar todo con Docker Compose.
4. Confirmar que frontend, gateway, servicios y base de datos están activos.
5. Abrir el dominio configurado.
6. Intentar autenticación con una cuenta no institucional y demostrar rechazo.
7. Autenticarse con una cuenta institucional.
8. Mostrar que se genera o utiliza JWT.
9. Consumir una funcionalidad protegida.
10. Mostrar el recorrido:
    - frontend;
    - API Gateway;
    - gRPC;
    - microservicio;
    - persistencia.
11. Mostrar los `.proto`.
12. Mostrar los contenedores.
13. Mostrar diagramas.
14. Mostrar matriz SOLID.
15. Mostrar el tag `0.2.0`.

---

# 29. Trazabilidad aproximada de la clase

| Tema | Tiempo aproximado |
|---|---|
| Inicio, DTT y agenda | `10:06–12:41` |
| Lectura de Práctica 2 | `13:47–16:40` |
| Avance esperado | `17:25–18:06` |
| Google OAuth y comunicación REST/gRPC | `18:46–20:05` |
| Horarios de calificación | `22:43–32:44` |
| Video y explicación de SOLID | `33:41–46:04` |
| Errores detectados en diagramas | `46:37–48:06` |
| Ejemplo de arquitectura de alto nivel | `48:06–1:15:01` |
| Ejemplo de diagrama de despliegue | `1:15:09–1:35:47` |
| Configuración de Google OAuth | `1:36:01–1:44:44` |

---

# 30. Conclusión para el agente

La revisión del repositorio debe centrarse en demostrar que la arquitectura implementada coincide con la arquitectura declarada.

Los mayores riesgos son:

1. usar REST entre microservicios;
2. saltarse el API Gateway;
3. permitir cuentas no institucionales;
4. tener OAuth configurado solo en frontend;
5. no validar JWT;
6. no utilizar realmente los `.proto`;
7. no levantar todo con Docker Compose;
8. usar Prisma, Firebase o Supabase;
9. usar Express u otra solución TypeScript cuando el tutor pidió NestJS;
10. presentar diagramas demasiado generales;
11. omitir protocolos, puertos, contenedores o infraestructura;
12. olvidar el documento Markdown, matriz SOLID o tag `0.2.0`;
13. confundir el ejemplo hipotético del tutor con la arquitectura obligatoria;
14. asumir que ngrok fue aprobado como sustituto del dominio local;
15. documentar algo diferente a lo que realmente ejecuta el código.

Ante cualquier punto ambiguo, el agente debe señalarlo y pedir comparación con el enunciado oficial, no completar el requisito por intuición.
