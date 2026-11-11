# Catálogo de Cursos · Prácticas de Programación Avanzada

Next.js (export estático) + **Firebase** en plan **Spark** (sin tarjeta de crédito).
El mismo repo evoluciona clase a clase:

| Clase | Tema | Estado de este repo |
|---|---|---|
| 1 | CI/CD con Firebase Hosting, preview channels y headers de seguridad | ✅ resuelta (incluida) |
| 2 · lunes | **SQL Connect**: PostgreSQL detrás de una API con autorización | ✅ implementada y verificada en producción |
| 3 · viernes | Analytics: plan de medición, consentimiento y SQL en BigQuery | próximamente |

> El enunciado, el cronograma y la rúbrica están en el documento de cada práctica.
> Este README es la guía técnica rápida.

---

## Arquitectura (clase 2)

```
 Navegador (Next.js estático)
   │  Firebase Auth (email/contraseña) ──────────▶ token con auth.uid y auth.token.email
   │
   │  executeQuery("ListCursos")  ┐
   │  executeMutation("Inscribirme", { cursoId })  ┘  solo NOMBRE + variables, nunca SQL
   ▼
 SQL Connect ── conector "cursos" (dataconnect/cursos/*.gql) ── @auth decide quién ejecuta qué
   ▼
 PostgreSQL (Cloud SQL, prueba sin costo 90 días)   ·   en desarrollo: emulador local (PGlite)
```

| Pieza | Rol |
|---|---|
| `dataconnect/schema/schema.gql` | Tablas `Curso`, `Alumno` y `Matricula` con clave compuesta |
| `dataconnect/cursos/queries.gql` · `mutations.gql` | Operaciones expuestas con autorización `@auth` |
| `dataconnect/seed_data.gql` | Datos iniciales (cursos y dos alumnos ficticios) |
| `lib/firebase.ts` | Inicializa Firebase; en `npm run dev` usa los **emuladores** |
| `lib/sqlconnect.ts` | Llama a las operaciones por nombre (ya escrito) |
| `scripts/atacar.mjs` | Auditoría: se comporta como un atacante y prueba tus reglas `@auth` |

---

## Si venís de la clase 1 (tu propio repo)

1. Commiteá todo lo que tengas.
2. Copiá **sobre tu repo** el contenido de este, **excepto** `.github/`, `.firebaserc` y `firebase.json`
   (esos ya los tenés configurados con tu proyecto).
3. En **tu** `firebase.json`, agregá estas dos claves al mismo nivel que `"hosting"`:
   ```json
   "dataconnect": { "source": "dataconnect" },
   "emulators": {
     "auth": { "port": 9099 },
     "dataconnect": { "port": 9399, "dataDir": "dataconnect/.dataconnect/pgliteData" },
     "hosting": { "port": 5000 },
     "ui": { "enabled": true },
     "singleProjectMode": true
   }
   ```
4. `npm install`

## Preparación previa (antes del lunes, ~20 min)

1. Consola de Firebase → **Authentication** → *Comenzar* → *Sign-in method* → habilitá
   **Correo electrónico/contraseña**.
2. Consola → ⚙ *Configuración del proyecto* → *Tus apps* → si no hay una **app web**, creala
   (ícono `</>`). Copiá `apiKey`, `authDomain`, `projectId` y `appId` en `lib/firebase-config.ts`.
3. Verificá que los emuladores arrancan (la primera vez descargan el emulador de SQL Connect):
   ```bash
   npm run emulators
   ```
   Tiene que mostrar *All emulators ready* con Auth en 9099 y SQL Connect en 9399.
   La interfaz de los emuladores queda en <http://127.0.0.1:4000>.
4. En otra terminal: `npm run seed` y luego `npm run dev` → abrí <http://localhost:3000/cursos>:
   tienen que aparecer 7 cursos leídos desde PostgreSQL.

> **Recomendado:** instalá la extensión **Firebase** de VS Code. Valida los `.gql` mientras
> escribís (autocompleta campos como `alumnoId_expr`) y permite ejecutar operaciones contra el
> emulador con un click.

---

## Implementación de la práctica

Tres terminales:

```bash
npm run emulators     # 1 · Auth + SQL Connect locales
npm run dev           # 2 · la app en http://localhost:3000
npm run atacar        # 3 · auditoría de seguridad (repetila después de cada cambio)
```

| Requisito | Implementación |
|---|---|
| L1 | `Matricula` muchos-a-muchos, clave compuesta y fecha del servidor |
| L2 | `Inscribirme` requiere usuario, es idempotente y toma el alumno de `auth.uid` |
| L3 | `MisInscripciones` devuelve las matrículas del usuario autenticado |
| L4 | `ListAlumnos` está protegido con `NO_ACCESS` |
| L5 | `DarmeDeBaja` elimina solo la matrícula del usuario autenticado |
| L6 | CSP permite las conexiones necesarias a Firebase Auth y SQL Connect |
| L7 | SQL Connect desplegado y verificado en producción |

Después de editar un `.gql`, mirá la terminal de los emuladores: ahí aparecen los errores de
compilación del esquema. Si no toma los cambios, reiniciá `npm run emulators`. Si cambiaste el
esquema y se queja de datos viejos, borrá `dataconnect/.dataconnect/` y volvé a correr `npm run seed`.

### Deploy a producción (L7)

```bash
npx firebase deploy --only dataconnect     # la 1.ª vez crea la instancia Cloud SQL de prueba
npx firebase dataconnect:execute dataconnect/seed_data.gql   # datos iniciales en producción
```

La creación de la instancia tarda varios minutos; mientras tanto SQL Connect guarda los
datos en una base temporal y los migra al terminar. Después, el frontend se publica como
siempre: **por Pull Request** (tu pipeline de la clase 1).

---

## Comandos

| Comando | Para qué |
|---|---|
| `npm run emulators` | Emuladores de Auth y SQL Connect (+ UI en :4000) |
| `npm run seed` | Carga `seed_data.gql` en el emulador (privilegios de admin) |
| `npm run atacar` | Auditoría de seguridad de las operaciones contra el emulador |
| `npm run dev` | App en modo desarrollo, conectada a los emuladores |
| `npm run build` · `npm run serve` | Build de producción + emulador de Hosting con headers |
| `node scripts/check-headers.mjs <URL>` | Verifica headers de seguridad y caché |
| `npx firebase dataconnect:sql:diff` | Diferencias entre tu esquema y la base de producción |

## Problemas frecuentes

- **"No hay conexión con los emuladores"**: falta `npm run emulators` en otra terminal.
- **El catálogo dice que no puede cargar** en `npm run dev`: emuladores apagados o falta `npm run seed`.
- **`operation not found`**: revisá que el conector haya compilado y desplegado las operaciones de `dataconnect/cursos/*.gql`.
- **`unauthenticated` al inscribirse**: no hay sesión iniciada (o la operación es `USER` y llamás sin login: ¡eso es lo correcto!).
- **En producción el catálogo no carga y la consola dice `Refused to connect`**: falta L6 (CSP `connect-src`).
- **Push de workflows rechazado** (*without workflow scope*): ver la preparación de la clase 1.

## Reflexión rápida (respuestas clave)

### 1) ¿Por qué ninguna operación de conector recibe el id del alumno como variable? ¿Qué es IDOR y cómo lo evita `auth.uid`?

Porque el cliente no puede decidir quién es el alumno que realiza la operación. En un sistema con autorización, el servidor debe derivar la identidad del usuario autenticado desde el token. Si el frontend enviara un `alumnoId` arbitrario, un atacante podría modificar la variable y inscribir o consultar otra cuenta. Eso es un IDOR (Insecure Direct Object Reference): el usuario manipula un identificador para acceder a recursos ajenos. SQL Connect evita esto con `auth.uid`, que usa el UID real del usuario autenticado desde Firebase Auth y lo incorpora en el servidor; la app no puede falsificarlo.

### 2) `ListCursos` es `PUBLIC` y `ListAlumnos` terminó en `NO_ACCESS`. ¿Qué criterio usa? ¿Cómo haría el "panel de admin" para listar alumnos?

El criterio es la sensibilidad de los datos: el catálogo es información pública, mientras que los alumnos y sus emails son datos personales y deben quedar fuera del cliente. `NO_ACCESS` significa que el cliente no puede ejecutarlo. Para un panel de administración, el acceso debe hacerse desde un entorno de backend confiable (por ejemplo, Admin SDK o un endpoint protegido del lado del servidor) con permisos explícitos y no vía una operación GraphQL pública. En otras palabras, el admin no es un usuario normal del navegador sino un servicio autorizado.

### 3) ¿Qué ventaja tiene una clave primaria compuesta en `Matricula` frente a validar duplicados en el código del cliente?

La base de datos garantiza la integridad de la relación. Si la clave primaria es `(alumno, curso)`, no pueden existir dos matrículas iguales aunque el cliente repita la llamada o un atacante intente hacer múltiples requests. La validación en el código del cliente es solamente una UX; no ofrece seguridad. La base de datos es la capa final y la que resiste condiciones de carrera o manipulación directa.

### 4) La configuración de Firebase (`apiKey`, etc.) es pública. ¿Por qué eso no compromete la base de datos? ¿Qué capa faltaría para frenar a alguien que use esa config desde un script? (Pista: App Check)

Porque la API key de Firebase es un identificador público, no una credencial de acceso. La verdadera seguridad se basa en Auth + reglas de autorización y en backend confiable. Un script externo puede usar la misma config, pero si el usuario no está autenticado o la operación está protegida por `@auth`, la base de datos no lo autoriza. Para frenar abuso desde scripts o clientes no confiables, falta App Check (y, en producción, políticas de abuso y rate limiting). App Check valida que el tráfico venga de una app genuina y no desde un script local o un entorno no autorizado.

### 5) Comparado con una API REST propia (Express + pg), ¿qué te da SQL Connect y qué perdés?

SQL Connect te da convivencia con Firebase Auth, autorizaciones declarativas con `@auth`, esquema relacional claro, y una API por nombre que evita escribir SQL en el cliente. También permite aislar la lógica de acceso a datos en el conector. Lo que perdés es flexibilidad total: no es el mejor punto de entrada para consultas ad hoc, lógica compleja del negocio o un control granular de cada endpoint como en una API REST propia, donde podés definir rutas y validaciones con mucho más detalle.

### 6) ¿Por qué no alcanzó con la CSP de la clase 1 y qué conviene listar dominios exactos en `connect-src`?

Porque esta práctica no solo sirve un sitio estático: la app también se conecta a Firebase Auth y a SQL Connect (emulador o producción). La CSP de la clase anterior estaba orientada a contenido estático y no contemplaba esos orígenes. Por eso, en `connect-src` conviene listar solo los dominios exactos que realmente necesita la aplicación: Firebase Auth, APIs de Data Connect y los emuladores locales. Esto reduce la superficie de ataque y evita que cualquier origen externo tenga permiso para abrir conexiones desde la web; además hace la política más mantenible y menos permisiva.
