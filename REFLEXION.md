# Reflexión sobre la práctica

## 1) ¿Por qué el preview tiene vencimiento? ¿Qué riesgos tendría un preview que no vence nunca?

El preview es un entorno efímero para validar cambios antes de pasar a producción. Tiene vencimiento para evitar que un PR viejo siga activo, que se use una URL caduca en documentación o que una rama eliminada deje un sitio accesible y no revisado. Si no venciera nunca, se acumularían canales viejos, se perdería trazabilidad, y cualquier persona con la URL podría ver una versión de prueba que ya no corresponde al estado actual del repo.

## 2) ¿Qué diferencia hay entre desplegar y liberar?

Desplegar es publicar una nueva versión en un entorno concreto (por ejemplo, un preview o `live`). Liberar es hacer que ese despliegue pase a estar disponible para usuarios reales o a convertirse en la versión activa de producción. En este flujo, el deploy a `live` es el despliegue; la promoción o rollback puede cambiar la versión que está “liberada” para el público.

## 3) ¿Por qué la clave de la service account va en un secreto y no en el repo? ¿Qué podría hacer alguien que la obtenga? ¿Cómo limitarías el daño?

La service account tiene permisos de despliegue y, si se compromete, puede publicar cambios en Firebase sin autorización del equipo. No debe ir en el repo porque GitHub y el historial del código no son un lugar seguro para secretos. Si alguien la obtiene, podría desplegar código malicioso, borrar o reemplazar releases, o manipular el proyecto completo. Para limitar el daño conviene usar permisos mínimos, un proyecto separado por entorno, rotación periódica de claves, GitHub Environments con aprobación manual y, si es posible, separar permisos por canal o proyecto.

## 4) La CSP rompió la app: ¿por qué? ¿Qué opciones evaluaste y qué costo de seguridad tiene cada una?

La CSP inicial bloqueaba los scripts inline de hidratación que Next.js genera dentro del HTML estático; por eso la página se veía, pero el filtro no respondía. Se permite `script-src 'self' 'unsafe-inline'` para que Next.js hidrate la app. Esto tiene un costo: si un XSS logra inyectar un script inline, la CSP ya no lo bloquea. No se habilita `unsafe-eval` ni se permite JavaScript desde orígenes externos. La imagen de portada solo necesita el origen concreto `https://picsum.photos`. Una alternativa más estricta sería generar hashes SHA-256 de los scripts inline de cada HTML durante el build y mantenerlos sincronizados con la CSP; eso evita `unsafe-inline`, pero requiere automatización en el pipeline para actualizarlos en cada build.

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

## Salida de validación local

Se validó la configuración con `npm run build` y el emulador de Firebase Hosting (`npm run serve`), usando `node scripts/check-headers.mjs http://localhost:5000`.

Resultado esperado de la validación en local:

- HTML con los headers de seguridad requeridos.
- `Cache-Control: no-cache, no-store, must-revalidate` en la home.
- `Cache-Control: public, max-age=31536000, immutable` en `/_next/static/**`.
- La app en `/cursos` funcionando correctamente con la CSP aplicada.

En producción, la misma verificación debería terminar con `✅ Todos los controles pasaron.`
