import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import {
  listarTrabajadores,
  buscarTrabajadorPorId,
  actualizarVerificacionTrabajador as guardarVerificacion,
} from "./../Models/trabajadoresModel.ts";

// GET /api/trabajadores
export async function obtenerTrabajadores(ctx: Context) {
  const trabajadores = await listarTrabajadores();
  ctx.response.status = 200;
  ctx.response.body = trabajadores;
}

// GET /api/trabajadores/:id
export async function obtenerTrabajadorPorId(ctx: RouterContext<string>) {
  const id = Number(ctx.params.id);
  const trabajador = await buscarTrabajadorPorId(id);

  if (!trabajador) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Trabajador no encontrado" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = trabajador;
}

// PUT /api/trabajadores/:id/verificacion (solo administradores)
export async function actualizarVerificacionTrabajador(ctx: RouterContext<string>) {
  const usuarioSesion = ctx.state.usuario as { rol?: number | string } | undefined;
  if (Number(usuarioSesion?.rol) !== 1) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Solo un administrador puede cambiar la verificaciÃ³n" };
    return;
  }

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El identificador del trabajador no es vÃ¡lido" };
    return;
  }

  let body: { verificado?: unknown };
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El cuerpo de la solicitud no es vÃ¡lido" };
    return;
  }

  if (typeof body.verificado !== "boolean") {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El estado verificado debe ser verdadero o falso" };
    return;
  }

  const actualizado = await guardarVerificacion(id, body.verificado);
  if (!actualizado) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Trabajador no encontrado" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: body.verificado ? "Trabajador verificado correctamente" : "VerificaciÃ³n retirada correctamente",
    id,
    Verificado: body.verificado,
  };
}
