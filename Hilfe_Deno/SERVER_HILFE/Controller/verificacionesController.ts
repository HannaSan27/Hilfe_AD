import { Context, RouterContext } from "../Dependencies/dependencies.ts";
import {
  listarSolicitudesVerificacion,
  obtenerSolicitudVerificacionPorId,
  obtenerSolicitudPorUsuarioId,
  aprobarVerificacion,
  solicitarInfoVerificacion,
  rechazarVerificacion,
  ponerEnRevisionVerificacion,
} from "../Models/verificacionesModel.ts";
import {
  obtenerDocumentosLegalesVigentes,
  consultarAceptacionesUsuario,
} from "../Models/legalesModel.ts";
import { nuevaConexion } from "../Models/conexion.ts";
import { validarTipoDocumento, validarNumeroDocumento, validarFechaExpedicion } from "../Helpers/validaciones.ts";

function esAdmin(ctx: Context): boolean {
  const usuario = ctx.state.usuario as { id?: number; rol?: number } | undefined;
  return Number(usuario?.rol) === 1;
}

// GET /api/admin/verificaciones
export async function listarVerificacionesAdmin(ctx: Context) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const url = ctx.request.url;
  const estado = url.searchParams.get("estado") || undefined;
  const rolParam = url.searchParams.get("rol");
  const rol = rolParam ? Number(rolParam) : undefined;
  const busqueda = url.searchParams.get("busqueda") || undefined;

  const solicitudes = await listarSolicitudesVerificacion({ estado, rol, busqueda });
  ctx.response.status = 200;
  ctx.response.body = solicitudes;
}

// GET /api/admin/verificaciones/:id
export async function detalleVerificacionAdmin(ctx: RouterContext<string>) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Identificador de solicitud no válido" };
    return;
  }

  const solicitud = await obtenerSolicitudVerificacionPorId(id);
  if (!solicitud) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Solicitud de verificación no encontrada" };
    return;
  }

  const aceptaciones = await consultarAceptacionesUsuario(Number(solicitud.Id_Usuario));

  ctx.response.status = 200;
  ctx.response.body = {
    ...solicitud,
    aceptacionesLegales: aceptaciones,
  };
}

// PUT /api/admin/verificaciones/:id/aprobar
export async function aprobarSolicitudAdmin(ctx: RouterContext<string>) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const id = Number(ctx.params.id);
  const adminId = Number((ctx.state.usuario as { id: number }).id);

  let body: { notas?: string } = {};
  try {
    body = await ctx.request.body.json();
  } catch {
    // notas opcionales
  }

  const exito = await aprobarVerificacion(id, adminId, body.notas);
  if (!exito) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Solicitud de verificación no encontrada" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "Identidad del usuario verificada y aprobada correctamente.",
    idSolicitud: id,
    estado: "aprobado",
  };
}

// PUT /api/admin/verificaciones/:id/solicitar-info
export async function solicitarInfoAdmin(ctx: RouterContext<string>) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const id = Number(ctx.params.id);
  const adminId = Number((ctx.state.usuario as { id: number }).id);

  let body: { infoRequerida?: string };
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Cuerpo de solicitud inválido" };
    return;
  }

  if (!body.infoRequerida || body.infoRequerida.trim().length === 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Debes indicar la información requerida o el motivo de corrección" };
    return;
  }

  const exito = await solicitarInfoVerificacion(id, adminId, body.infoRequerida.trim());
  if (!exito) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Solicitud de verificación no encontrada" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "Se ha solicitado información adicional al usuario.",
    idSolicitud: id,
    estado: "requiere_informacion",
  };
}

// PUT /api/admin/verificaciones/:id/rechazar
export async function rechazarSolicitudAdmin(ctx: RouterContext<string>) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const id = Number(ctx.params.id);
  const adminId = Number((ctx.state.usuario as { id: number }).id);

  let body: { motivo?: string };
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Cuerpo de solicitud inválido" };
    return;
  }

  if (!body.motivo || body.motivo.trim().length === 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Debes especificar el motivo del rechazo" };
    return;
  }

  const exito = await rechazarVerificacion(id, adminId, body.motivo.trim());
  if (!exito) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Solicitud de verificación no encontrada" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "Solicitud de verificación rechazada.",
    idSolicitud: id,
    estado: "rechazado",
  };
}

// PUT /api/admin/verificaciones/:id/en-revision
export async function ponerEnRevisionAdmin(ctx: RouterContext<string>) {
  if (!esAdmin(ctx)) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Acceso denegado: se requieren permisos de administrador" };
    return;
  }

  const id = Number(ctx.params.id);
  const adminId = Number((ctx.state.usuario as { id: number }).id);

  let body: { notas?: string } = {};
  try {
    body = await ctx.request.body.json();
  } catch {
    // notas opcionales
  }

  const exito = await ponerEnRevisionVerificacion(id, adminId, body.notas);
  if (!exito) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Solicitud de verificación no encontrada" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "La solicitud ha sido marcada en revisión.",
    idSolicitud: id,
    estado: "en_revision",
  };
}

// GET /api/verificaciones/mi-estado
export async function miEstadoVerificacion(ctx: Context) {
  const usuario = ctx.state.usuario as { id?: number } | undefined;
  if (!usuario?.id) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Sesión no válida" };
    return;
  }

  const solicitud = await obtenerSolicitudPorUsuarioId(Number(usuario.id));
  ctx.response.status = 200;
  ctx.response.body = {
    solicitud: solicitud ? {
      idSolicitud: solicitud.Id_Solicitud_Verificacion,
      estado: solicitud.Estado,
      fechaCreacion: solicitud.Fecha_Creacion,
      fechaRevision: solicitud.Fecha_Revision,
      informacionRequerida: solicitud.Informacion_Requerida,
      motivoRechazo: solicitud.Motivo_Rechazo,
    } : null,
  };
}

// PUT /api/verificaciones/mi-solicitud
export async function corregirMiVerificacion(ctx: Context) {
  const usuario = ctx.state.usuario as { id?: number; rol?: number } | undefined;
  if (!usuario?.id || ![2, 3].includes(Number(usuario.rol))) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Esta sesión no puede corregir una solicitud de verificación" };
    return;
  }

  let body: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicionDocumento?: string };
  try {
    body = await ctx.request.body.json();
  } catch {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Cuerpo de solicitud inválido" };
    return;
  }

  const tipoDocumento = String(body.tipoDocumento || "").toUpperCase();
  const numeroDocumento = String(body.numeroDocumento || "").trim();
  const fechaExpedicionDocumento = String(body.fechaExpedicionDocumento || "").trim();
  const numeroValido = validarNumeroDocumento(tipoDocumento, numeroDocumento);
  const fechaValida = validarFechaExpedicion(fechaExpedicionDocumento);
  if (!validarTipoDocumento(tipoDocumento) || !numeroValido.valido || !fechaValida.valido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: numeroValido.mensaje || fechaValida.mensaje || "El tipo de documento no es válido" };
    return;
  }

  const db = await nuevaConexion();
  let enTransaccion = false;
  try {
    await db.execute("START TRANSACTION");
    enTransaccion = true;
    const usuarios = await db.query(
      "SELECT Id_Usuario, Estado_Verificacion FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = ? FOR UPDATE",
      [Number(usuario.id), Number(usuario.rol)]
    );
    if (!usuarios.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "No se encontró la cuenta asociada a esta sesión" };
      return;
    }
    if (!["requiere_informacion", "rechazado"].includes(usuarios[0].Estado_Verificacion)) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "La solicitud no requiere correcciones en este momento" };
      return;
    }

    const documentoEnUso = await db.query(
      "SELECT Id_Usuario FROM usuarios WHERE Tipo_Documento = ? AND Numero_Documento = ? AND Id_Usuario <> ? LIMIT 1",
      [tipoDocumento, numeroDocumento, Number(usuario.id)]
    );
    if (documentoEnUso.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "Ese documento ya está asociado a otra cuenta" };
      return;
    }

    await db.execute(
      `UPDATE usuarios
       SET Tipo_Documento = ?, Numero_Documento = ?, Fecha_Expedicion_Documento = ?,
           Estado_Verificacion = 'pendiente', Verificado = 0
       WHERE Id_Usuario = ?`,
      [tipoDocumento, numeroDocumento, fechaExpedicionDocumento, Number(usuario.id)]
    );
    await db.execute(
      `INSERT INTO solicitudes_verificacion
        (Id_Usuario, Tipo_Documento, Numero_Documento, Fecha_Expedicion_Documento, Estado)
       VALUES (?, ?, ?, ?, 'pendiente')`,
      [Number(usuario.id), tipoDocumento, numeroDocumento, fechaExpedicionDocumento]
    );
    await db.execute("COMMIT");
    enTransaccion = false;
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Tus correcciones fueron enviadas. La solicitud volvió a revisión.", estado: "pendiente" };
  } catch (error) {
    if (enTransaccion) await db.execute("ROLLBACK").catch(() => {});
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "No se pudieron guardar las correcciones" };
  } finally {
    await db.close().catch(() => {});
  }
}

// GET /api/legal/documentos
export async function listarDocumentosLegales(ctx: Context) {
  const docs = await obtenerDocumentosLegalesVigentes();
  ctx.response.status = 200;
  ctx.response.body = docs;
}
