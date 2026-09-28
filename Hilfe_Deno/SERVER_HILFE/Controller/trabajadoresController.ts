import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import { listarTrabajadores, buscarTrabajadorPorId } from "./../Models/trabajadoresModel.ts";

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