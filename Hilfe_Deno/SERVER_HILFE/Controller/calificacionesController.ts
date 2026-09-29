import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import { crearCalificacion, listarCalificacionesPorTrabajador } from "./../Models/calificacionesModel.ts";

// POST /api/calificaciones
export async function registrarCalificacion(ctx: Context) {
  const body = await ctx.request.body.json();
  const { idSolicitud, puntaje, comentario } = body;

  if (!idSolicitud || !puntaje) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "idSolicitud y puntaje son obligatorios" };
    return;
  }

  if (puntaje < 1 || puntaje > 5) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El puntaje debe estar entre 1 y 5" };
    return;
  }

  await crearCalificacion(idSolicitud, puntaje, comentario || null);

  ctx.response.status = 201;
  ctx.response.body = { mensaje: "Calificación registrada correctamente" };
}

// GET /api/calificaciones/trabajador/:id
export async function obtenerCalificacionesTrabajador(ctx: RouterContext<string>) {
  const idTrabajador = Number(ctx.params.id);
  const calificaciones = await listarCalificacionesPorTrabajador(idTrabajador);

  ctx.response.status = 200;
  ctx.response.body = calificaciones;
}