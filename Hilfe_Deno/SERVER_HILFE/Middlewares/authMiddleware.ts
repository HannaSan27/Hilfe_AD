import { Context } from "./../Dependencies/dependencies.ts";
import { verificarToken } from "./../Helpers/jwtHelper.ts";

// Este middleware protege rutas que solo pueden usar usuarios logueados
export async function verificarSesion(ctx: Context, next: () => Promise<unknown>) {
  const encabezado = ctx.request.headers.get("Authorization");

  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "No se envió el token de sesión" };
    return;
  }

  const token = encabezado.replace("Bearer ", "");

  try {
    const datos = await verificarToken(token);
    const alcance = (datos as { alcance?: string }).alcance;
    if (alcance === "verificacion") {
      const ruta = ctx.request.url.pathname;
      const metodo = ctx.request.method.toUpperCase();
      const permitida = (ruta === "/api/verificaciones/mi-estado" && metodo === "GET") ||
        (ruta === "/api/verificaciones/mi-solicitud" && metodo === "PUT");
      if (!permitida) {
        ctx.response.status = 403;
        ctx.response.body = { mensaje: "Esta sesión solo permite consultar o corregir tu verificación" };
        return;
      }
    }
    ctx.state.usuario = datos; // guardamos el id y rol del usuario para usarlo después
    await next();
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Token inválido o expirado" };
  }
}
