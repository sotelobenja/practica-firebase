# Evidencias de la práctica

## Rollback aplicado

La versión activa volvió a `c13a26` (la versión anterior a `bdd9cc`).

![Historial de Firebase Hosting con c13a26 como versión actual tras el rollback](./image.png)

## Versión republicada después del rollback

Después de verificar el rollback, se volvió a desplegar la versión más reciente disponible en ese momento (`40f214`).

![Firebase Hosting muestra 40f214 como versión actual luego del redeploy](./image-1.png)

## Validación de producción

Comando ejecutado después del despliegue:

```text
node scripts/check-headers.mjs https://practica-firebase-a8e3e.web.app
```

Resultado observado:

```text
▶ HTML: https://practica-firebase-a8e3e.web.app/
  status 200
  ✔ content-security-policy
  ✔ strict-transport-security
  ✔ x-content-type-options: nosniff
  ✔ x-frame-options: DENY
  ✔ referrer-policy: strict-origin-when-cross-origin
  ✔ permissions-policy: camera=(), microphone=(), geolocation=()
  · cache-control: no-cache, no-store, must-revalidate

▶ Asset estático: /_next/static/chunks/1x6obpmlu1_c2.js
  ✔ cache-control: public, max-age=31536000, immutable

✅ Todos los controles pasaron.
```

También se comprobó que la página `/cursos` responde y que la búsqueda de “React” muestra `1 de 6 cursos`; al elegir “Inicial”, el filtro muestra `2 de 6 cursos`.

## Enlaces de entrega

- Repositorio: https://github.com/sotelobenja/practica-firebase
- Producción: https://practica-firebase-a8e3e.web.app/
- PR de CI/CD y preview: https://github.com/sotelobenja/practica-firebase/pull/1
- PR de eliminación de imagen caída: https://github.com/sotelobenja/practica-firebase/pull/2