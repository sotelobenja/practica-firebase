# Reflexión sobre la práctica

## 1) ¿Por qué el preview tiene vencimiento? ¿Qué riesgos tendría un preview que no vence nunca?

El preview es un entorno efímero para validar cambios antes de pasar a producción. Tiene vencimiento para evitar que un PR viejo siga activo, que se use una URL caduca en documentación o que una rama eliminada deje un sitio accesible y no revisado. Si no venciera nunca, se acumularían canales viejos, se perdería trazabilidad, y cualquier persona con la URL podría ver una versión de prueba que ya no corresponde al estado actual del repo.

## 2) ¿Qué diferencia hay entre desplegar y liberar?

Desplegar es publicar una nueva versión en un entorno concreto (por ejemplo, un preview o `live`). Liberar es hacer que ese despliegue pase a estar disponible para usuarios reales o a convertirse en la versión activa de producción. En este flujo, el deploy a `live` es el despliegue; la promoción o rollback puede cambiar la versión que está “liberada” para el público.

## 3) ¿Por qué la clave de la service account va en un secreto y no en el repo? ¿Qué podría hacer alguien que la obtenga? ¿Cómo limitarías el daño?

La service account tiene permisos de despliegue y, si se compromete, puede publicar cambios en Firebase sin autorización del equipo. No debe ir en el repo porque GitHub y el historial del código no son un lugar seguro para secretos. Si alguien la obtiene, podría desplegar código malicioso, borrar o reemplazar releases, o manipular el proyecto completo. Para limitar el daño conviene usar permisos mínimos, un proyecto separado por entorno, rotación periódica de claves, GitHub Environments con aprobación manual y, si es posible, separar permisos por canal o proyecto.

## 4) La CSP rompió la app: ¿por qué? ¿Qué opciones evaluaste y qué costo de seguridad tiene cada una?

La CSP inicial bloqueaba los scripts inline de hidratación que Next.js genera dentro del HTML estático; por eso la página se veía, pero el filtro no respondía. Se permite `script-src 'self' 'unsafe-inline'` para que Next.js hidrate la app. Esto tiene un costo: si un XSS logra inyectar un script inline, la CSP ya no lo bloquea. No se habilita `unsafe-eval` ni se permite JavaScript desde orígenes externos. La imagen externa de portada se quitó porque su servicio no cargaba de forma confiable; por eso `img-src` ahora permite únicamente imágenes del propio sitio (`'self'`). Una alternativa más estricta sería generar hashes SHA-256 de los scripts inline de cada HTML durante el build y mantenerlos sincronizados con la CSP; eso evita `unsafe-inline`, pero requiere automatización en el pipeline para actualizarlos en cada build.

## 5) Para cada header de B2, ¿qué ataque mitiga?

- Strict-Transport-Security: obliga a HTTPS y evita downgrade / MITM sobre HTTP.
- X-Content-Type-Options: evita que el navegador interprete un recurso como HTML, JS o XML si no corresponde.
- X-Frame-Options: evita clickjacking y que el sitio sea embebido en un iframe hostil.
- Referrer-Policy: reduce la fuga de información sensible en la URL del referer a otros sitios.
- Permissions-Policy: limita APIs del navegador y evita abuso de micrófono, cámara o geolocalización.

## 6) ¿Por qué los assets de /_next/static/ pueden cachearse un año y el HTML no?

Los assets con hash de contenido son inmutables: si cambian, se genera otro nombre de archivo y se evita romper cachés. El HTML, en cambio, es el documento que enlaza a esos assets y puede cambiar en cada deploy o rollback, por lo que debe revalidarse para que los usuarios vean la versión correcta sin quedarse con una página vieja.

## 7) Si la app necesitara SSR, ¿qué cambiaría en la arquitectura, la CSP y el costo?

Con SSR o Server Actions ya no sería posible servir solo archivos estáticos desde Firebase Hosting Spark. Habría que usar App Hosting o un backend gestionado, con más complejidad operativa y costo. En la CSP habría que abrir más orígenes y probablemente permitir más conectividad y, en algunos casos, más políticas de scripts o de conexión. Eso aumenta la superficie de ataque y exige auditoría adicional sobre dependencias y runtime.

## Reflexión de SQL Connect

### 1) ¿Por qué ninguna operación recibe el id del alumno como variable? ¿Qué es IDOR y cómo lo evita `auth.uid`?

El cliente no debe elegir la identidad sobre la que opera. Si enviara un `alumnoId`, un atacante podría sustituirlo por el de otra persona y acceder a sus datos: eso es IDOR. `auth.uid` obtiene del token verificado el UID del usuario autenticado, por lo que la operación usa la identidad del llamante, no un valor manipulable del cliente.

### 2) `ListCursos` es `PUBLIC` y `ListAlumnos` es `NO_ACCESS`. ¿Qué criterio se usa? ¿Cómo listaría alumnos un panel de administración?

El catálogo es público; los nombres y emails son datos personales, así que `ListAlumnos` se rechaza para clientes. Un panel administrativo debe consultar esos datos desde un backend confiable, con identidad y permisos administrativos explícitos, no desde una operación abierta al navegador.

### 3) ¿Qué ventaja tiene la clave primaria compuesta de `Matricula` frente a validar duplicados en el cliente?

La clave `(alumno, curso)` hace que la base de datos garantice que no haya matrículas duplicadas, incluso ante requests repetidos o concurrentes. Una validación en la interfaz solo mejora la experiencia y se puede omitir o manipular.

### 4) La configuración Firebase es pública. ¿Por qué eso no compromete la base? ¿Qué aportaría App Check?

La `apiKey` identifica el proyecto; no es una credencial que autorice acceso a los datos. La autorización depende de Firebase Auth y las reglas `@auth` de SQL Connect. App Check agrega una señal de que las solicitudes provienen de una app legítima y ayuda a reducir el abuso desde scripts, pero no reemplaza la autenticación ni las reglas de autorización.

### 5) Frente a una API REST propia (Express + pg), ¿qué aporta SQL Connect y qué se pierde?

SQL Connect integra las operaciones con Firebase Auth, ofrece autorización declarativa y expone operaciones tipadas sin enviar SQL desde el cliente. A cambio, ofrece menos libertad para diseñar endpoints y ejecutar lógica de negocio muy personalizada que una API propia.

### 6) ¿Por qué no alcanzaba la CSP de la clase 1 y qué conviene listar en `connect-src`?

La app ahora se conecta desde el navegador a Firebase Auth y SQL Connect, orígenes que no necesitaba el sitio estático anterior. `connect-src` debe permitir solo los dominios realmente usados por esos servicios y, en desarrollo, los puertos de los emuladores. Así se evitan conexiones arbitrarias y se limita la superficie permitida.

## Evidencia de validación de headers

### Antes de configurar los headers (B1)

Comando: `node scripts/check-headers.mjs https://practica-firebase-a8e3e.web.app`

Resultado observado antes del primer deploy a producción:

```text
HTML: status 404
Faltaban: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options,
Referrer-Policy y Permissions-Policy.
No se encontró un asset /_next/static/*.js en el HTML.
Resultado: 5 controles pendientes.
```

La respuesta 404 indica que en ese momento todavía no estaba disponible el sitio en producción. Por eso esta medición inicial no representa un sitio accesible sin headers, sino el estado previo al deploy.

### Después de configurar los headers (B5)

Comando: `node scripts/check-headers.mjs https://practica-firebase-a8e3e.web.app`

Resultado observado después del deploy manual a producción:

```text
HTML: status 200
Content-Security-Policy: presente (incluye script-src 'self' 'unsafe-inline')
Strict-Transport-Security: presente
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control HTML: no-cache, no-store, must-revalidate
Cache-Control asset: public, max-age=31536000, immutable
Resultado: Todos los controles pasaron.
```

También se comprobó en `/cursos` que la búsqueda de “React” muestra `1 de 6 cursos` y el filtro “Inicial” muestra `2 de 6 cursos`.
