# Hilf'e: configuración para el equipo

## Requisitos

- Node.js 22.12 o posterior.
- Deno y MySQL 8.
- Una base MySQL llamada `hilfe` con las migraciones aplicadas.
- Acceso de red desde Astro y Deno al mismo servidor MySQL.

## Configuración de cada computador

Los archivos `.env` son locales y están excluidos de Git. Cada integrante debe crearlos a partir de las plantillas:

1. Copia `Hilfe_Astro/ASTRO_HILFE/.env.example` a `Hilfe_Astro/ASTRO_HILFE/.env`.
2. Copia `Hilfe_Deno/SERVER_HILFE/.env.example` a `Hilfe_Deno/SERVER_HILFE/.env`.
3. En **ambos** archivos configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` con los mismos datos de conexión. `DB_NAME` debe ser `hilfe`.
4. Si MySQL está en otro computador, `DB_HOST` debe ser su dirección de red, no `localhost` ni `127.0.0.1`. El servidor MySQL debe permitir conexiones desde los equipos del grupo y el firewall debe permitir el puerto configurado, idealmente solo desde la red del equipo.
5. `PUBLIC_API_BASE_URL` en el `.env` de Astro debe señalar al backend Deno que va a usar ese Astro. Si Astro y Deno corren en el mismo computador, deja `http://127.0.0.1:8000/api`. Si Deno corre en otro computador, usa su dirección de red, por ejemplo `http://192.168.1.20:8000/api`.
6. En Deno, `HOST=0.0.0.0` permite recibir conexiones de otros computadores de la red. No publiques estos puertos directamente en Internet.
7. Usa un `JWT_SECRET` privado. Para Google, `PUBLIC_GOOGLE_CLIENT_ID` en Astro debe coincidir con `GOOGLE_CLIENT_ID` en Deno. Google OAuth es opcional para el login con correo y contraseña.

No subas `.env` a Git ni compartas contraseñas, claves JWT o credenciales de correo. Las plantillas solo deben contener nombres de variables y valores de ejemplo.

## Ejecutar en cada computador

Inicia primero MySQL. Luego, en dos terminales:

```powershell
cd Hilfe_Deno\SERVER_HILFE
deno task dev
```

```powershell
cd Hilfe_Astro\ASTRO_HILFE
npm ci
npm run dev
```

Abre `http://localhost:4321` en ese mismo computador. Cada navegador tiene sus propias cookies y almacenamiento local, así que cada persona inicia sesión por separado. Si se alterna entre `localhost` y `127.0.0.1`, hay que iniciar sesión de nuevo en el origen elegido.

## Comprobar conexiones

Abre `http://localhost:4321/api/health`. Debe responder con `ok: true`, `astroDatabase: "ok"` y `denoApi: "ok"`.

- `astroDatabase: "unavailable"`: revisa las variables `DB_*` del `.env` de Astro.
- `denoApi: "unavailable"`: revisa que Deno esté encendido, la dirección `PUBLIC_API_BASE_URL` y las variables `DB_*` del `.env` de Deno.
- Si ambos están `ok` pero el login falla, revisa en la consola de Deno el mensaje de la solicitud y confirma que el correo/cuenta exista y esté habilitado en la base compartida.

## Orígenes de Google

Para usar Google, en el cliente OAuth de tipo **Web application** agrega el origen exacto que abrirá el navegador, por ejemplo `http://localhost:4321`. No agregues rutas como `/login/login`; para otro computador o IP, autoriza el origen exacto correspondiente.
