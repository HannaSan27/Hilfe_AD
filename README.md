# HILFE: configuración local del equipo

## Inicio de sesión con Google

Cada integrante debe tener un cliente OAuth 2.0 de tipo **Web application** en Google Cloud Console. En sus orígenes JavaScript autorizados agregue los dos orígenes que usa el desarrollo local:

- `http://localhost:4321`
- `http://127.0.0.1:4321`

No agregue rutas como `/login/login` ni el puerto de la API como origen del navegador. Para otros puertos o dominios, cada origen exacto debe agregarse a la configuración de Google.

1. Copie `Hilfe_Astro/ASTRO_HILFE/.env.example` como `Hilfe_Astro/ASTRO_HILFE/.env` y complete `PUBLIC_GOOGLE_CLIENT_ID` con el Client ID web.
2. Copie `Hilfe_Deno/SERVER_HILFE/.env.example` como `Hilfe_Deno/SERVER_HILFE/.env` y ponga ese mismo Client ID en `GOOGLE_CLIENT_ID`. Configure también la base de datos local y un `JWT_SECRET` privado.
3. Mantenga ambos archivos `.env` locales; no los suba a Git ni comparta contraseñas, llaves JWT o llaves privadas.
4. Reinicie Astro y Deno después de cambiar las variables.

En desarrollo, inicie MySQL con la base de datos `hilfe`, luego el backend desde `Hilfe_Deno/SERVER_HILFE` con `deno task dev` y el frontend desde `Hilfe_Astro/ASTRO_HILFE` con `npm run dev`.

El ID de Google es público y debe coincidir entre frontend y backend: el navegador lo usa para mostrar el botón, y el backend verifica que el token de Google fue emitido para la misma aplicación. La configuración OAuth vive en Google Cloud Console y no viaja en los cambios de Git; cada ambiente debe autorizar su propio dominio u origen.
