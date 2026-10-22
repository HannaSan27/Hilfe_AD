import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import {
  crearCalificacion,
  obtenerSolicitudParaCalificar,
  obtenerFotosCalificacion,
  listarCalificacionesPorTrabajador,
} from "./../Models/calificacionesModel.ts";

const directorioFotos = new URL("../uploads/calificaciones/", import.meta.url);
const tiposImagen = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_FOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

function esNombreFotoSeguro(nombre: unknown): nombre is string {
  return typeof nombre === "string" && /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(nombre);
}

// Convierte el valor de Foto_Calificacion (JSON) en una lista de nombres válidos
function leerFotos(valor: unknown): string[] {
  if (typeof valor !== "string" || !valor) return [];
  try {
    const lista = JSON.parse(valor);
    return Array.isArray(lista) ? lista.filter(esNombreFotoSeguro) : [];
  } catch {
    return [];
  }
}

// POST /api/calificaciones  (multipart/form-data con campo "fotos", o JSON sin fotos)
export async function registrarCalificacion(ctx: Context) {
  const guardados: string[] = [];
  try {
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    if (!sesion?.id) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "Inicia sesión para calificar" };
      return;
    }

    const contentType = ctx.request.headers.get("content-type") || "";
    let idSolicitud: number;
    let puntaje: number;
    let comentario: string | null;
    let archivos: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await ctx.request.body.formData();
      idSolicitud = Number(form.get("idSolicitud"));
      puntaje = Number(form.get("puntaje"));
      const c = form.get("comentario");
      comentario = typeof c === "string" && c.trim() ? c.trim() : null;
      archivos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
    } else {
      const body = await ctx.request.body.json();
      idSolicitud = Number(body.idSolicitud);
      puntaje = Number(body.puntaje);
      comentario = body.comentario ? String(body.comentario).trim() : null;
    }

    if (!idSolicitud || !puntaje) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "idSolicitud y puntaje son obligatorios" };
      return;
    }
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "El puntaje debe estar entre 1 y 5" };
      return;
    }
    if (comentario && comentario.length > 500) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "El comentario no puede superar 500 caracteres" };
      return;
    }
    if (archivos.length > MAX_FOTOS) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: `Máximo ${MAX_FOTOS} fotos por calificación` };
      return;
    }
    for (const archivo of archivos) {
      if (!tiposImagen.has(archivo.type)) {
        ctx.response.status = 400;
        ctx.response.body = { mensaje: "Las fotos deben ser JPG, PNG o WEBP" };
        return;
      }
      if (archivo.size > MAX_BYTES) {
        ctx.response.status = 400;
        ctx.response.body = { mensaje: "Cada foto debe pesar como máximo 5 MB" };
        return;
      }
    }

    const solicitud = await obtenerSolicitudParaCalificar(idSolicitud);
    if (!solicitud) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }
    if (Number(solicitud.Id_Cliente) !== Number(sesion.id)) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Solo puedes calificar tus propias solicitudes" };
      return;
    }
    if (solicitud.Estado_Solicitudes !== "finalizado") {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Solo puedes calificar servicios finalizados" };
      return;
    }
    if (Number(solicitud.Total_Calificaciones) > 0) {
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "Este servicio ya fue calificado" };
      return;
    }

    // Guardar archivos en disco
    await Deno.mkdir(directorioFotos, { recursive: true });
    for (const archivo of archivos) {
      const nombre = `${crypto.randomUUID()}.${tiposImagen.get(archivo.type)}`;
      await Deno.writeFile(new URL(nombre, directorioFotos), new Uint8Array(await archivo.arrayBuffer()));
      guardados.push(nombre);
    }

    // Un solo INSERT: calificación + nombres de las fotos en Foto_Calificacion
    await crearCalificacion(idSolicitud, puntaje, comentario, guardados);

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Calificación registrada correctamente", fotos: guardados.length };
  } catch (error) {
    for (const nombre of guardados) {
      await Deno.remove(new URL(nombre, directorioFotos)).catch(() => {});
    }
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al registrar la calificación", error: String(error) };
  }
}

// GET /api/calificaciones/trabajador/:id  (cada calificación trae su arreglo "fotos")
export async function obtenerCalificacionesTrabajador(ctx: RouterContext<string>) {
  const idTrabajador = Number(ctx.params.id);
  const calificaciones = await listarCalificacionesPorTrabajador(idTrabajador);

  ctx.response.status = 200;
  ctx.response.body = calificaciones.map((c: Record<string, unknown>) => {
    const { Foto_Calificacion, ...resto } = c;
    return {
      ...resto,
      fotos: leerFotos(Foto_Calificacion).map((_, indice) => ({
        url: `/api/calificaciones/${c.Id_Calificaciones}/fotos/${indice}/archivo`,
      })),
    };
  });
}

// GET /api/calificaciones/:id/fotos/:indice/archivo
export async function getArchivoFotoCalificacion(ctx: RouterContext<string>) {
  try {
    const { id, indice } = ctx.params as { id: string; indice: string };
    const fotos = leerFotos(await obtenerFotosCalificacion(Number(id)));
    const nombre = fotos[Number(indice)];
    if (!esNombreFotoSeguro(nombre)) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Foto no encontrada" };
      return;
    }
    const extension = nombre.split(".").pop();
    ctx.response.headers.set("Content-Type", `image/${extension === "jpg" ? "jpeg" : extension}`);
    ctx.response.headers.set("Cache-Control", "public, max-age=3600");
    ctx.response.body = await Deno.readFile(new URL(nombre, directorioFotos));
  } catch {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "No se encontró el archivo de la foto" };
  }
}