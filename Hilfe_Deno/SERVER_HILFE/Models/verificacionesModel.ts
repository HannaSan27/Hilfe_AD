import client from "./conexion.ts";

export type EstadoVerificacion =
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "requiere_informacion"
  | "rechazado";

export interface SolicitudVerificacionFiltros {
  estado?: string;
  rol?: number;
  busqueda?: string;
}

export async function crearSolicitudVerificacion(
  idUsuario: number,
  tipoDocumento: string,
  numeroDocumento: string,
  fechaExpedicion: string
) {
  const resultado = await client.execute(
    `INSERT INTO solicitudes_verificacion
      (Id_Usuario, Tipo_Documento, Numero_Documento, Fecha_Expedicion_Documento, Estado)
     VALUES (?, ?, ?, ?, 'pendiente')`,
    [idUsuario, tipoDocumento, numeroDocumento, fechaExpedicion]
  );
  return resultado.lastInsertId;
}

export async function listarSolicitudesVerificacion(filtros: SolicitudVerificacionFiltros = {}) {
  let sql = `
    SELECT
      sv.Id_Solicitud_Verificacion,
      sv.Id_Usuario,
      sv.Tipo_Documento,
      CONCAT(REPEAT('•', GREATEST(0, CHAR_LENGTH(sv.Numero_Documento) - 4)), RIGHT(sv.Numero_Documento, 4)) AS Numero_Documento_Enmascarado,
      sv.Fecha_Expedicion_Documento,
      sv.Estado,
      sv.Notas_Admin,
      sv.Motivo_Rechazo,
      sv.Informacion_Requerida,
      sv.Revisado_Por,
      admin.Nombre AS Nombre_Admin_Revisor,
      sv.Fecha_Revision,
      sv.Fecha_Creacion,
      u.Nombre AS Nombre_Usuario,
      u.Correo AS Correo_Usuario,
      u.Telefono AS Telefono_Usuario,
      u.Ubicacion AS Ubicacion_Usuario,
      u.Id_Rol,
      r.Nombre_Rol,
      u.Foto_Perfil
    FROM solicitudes_verificacion sv
    JOIN usuarios u ON sv.Id_Usuario = u.Id_Usuario
    JOIN roles r ON u.Id_Rol = r.Id_Rol
    LEFT JOIN usuarios admin ON sv.Revisado_Por = admin.Id_Usuario
    WHERE 1 = 1
  `;
  const params: unknown[] = [];

  if (filtros.estado && filtros.estado !== "todos") {
    sql += " AND sv.Estado = ?";
    params.push(filtros.estado);
  }

  if (filtros.rol && Number(filtros.rol) > 0) {
    sql += " AND u.Id_Rol = ?";
    params.push(Number(filtros.rol));
  }

  if (filtros.busqueda && filtros.busqueda.trim() !== "") {
    sql += " AND (u.Nombre LIKE ? OR u.Correo LIKE ? OR sv.Numero_Documento LIKE ?)";
    const like = `%${filtros.busqueda.trim()}%`;
    params.push(like, like, like);
  }

  sql += " ORDER BY sv.Fecha_Creacion DESC";

  return await client.query(sql, params);
}

export async function obtenerSolicitudVerificacionPorId(idSolicitud: number) {
  const resultado = await client.query(
    `SELECT
      sv.Id_Solicitud_Verificacion,
      sv.Id_Usuario,
      sv.Tipo_Documento,
      sv.Numero_Documento,
      sv.Fecha_Expedicion_Documento,
      sv.Estado,
      sv.Notas_Admin,
      sv.Motivo_Rechazo,
      sv.Informacion_Requerida,
      sv.Revisado_Por,
      admin.Nombre AS Nombre_Admin_Revisor,
      sv.Fecha_Revision,
      sv.Fecha_Creacion,
      u.Nombre AS Nombre_Usuario,
      u.Correo AS Correo_Usuario,
      u.Telefono AS Telefono_Usuario,
      u.Ubicacion AS Ubicacion_Usuario,
      u.Fecha_Registro,
      u.Id_Rol,
      r.Nombre_Rol,
      u.Foto_Perfil
    FROM solicitudes_verificacion sv
    JOIN usuarios u ON sv.Id_Usuario = u.Id_Usuario
    JOIN roles r ON u.Id_Rol = r.Id_Rol
    LEFT JOIN usuarios admin ON sv.Revisado_Por = admin.Id_Usuario
    WHERE sv.Id_Solicitud_Verificacion = ?`,
    [idSolicitud]
  );
  return resultado[0] || null;
}

export async function obtenerSolicitudPorUsuarioId(idUsuario: number) {
  const resultado = await client.query(
    `SELECT
      sv.Id_Solicitud_Verificacion,
      sv.Id_Usuario,
      sv.Tipo_Documento,
      sv.Numero_Documento,
      sv.Fecha_Expedicion_Documento,
      sv.Estado,
      sv.Notas_Admin,
      sv.Motivo_Rechazo,
      sv.Informacion_Requerida,
      sv.Fecha_Revision,
      sv.Fecha_Creacion
    FROM solicitudes_verificacion sv
    WHERE sv.Id_Usuario = ?
    ORDER BY sv.Fecha_Creacion DESC
    LIMIT 1`,
    [idUsuario]
  );
  return resultado[0] || null;
}

async function esSolicitudActualEditable(solicitud: { Id_Solicitud_Verificacion: number; Id_Usuario: number; Estado: EstadoVerificacion }) {
  const actual = await client.query(
    `SELECT Id_Solicitud_Verificacion, Estado FROM solicitudes_verificacion
     WHERE Id_Usuario = ? ORDER BY Fecha_Creacion DESC, Id_Solicitud_Verificacion DESC LIMIT 1`,
    [solicitud.Id_Usuario]
  );
  return Number(actual[0]?.Id_Solicitud_Verificacion) === Number(solicitud.Id_Solicitud_Verificacion) &&
    ["pendiente", "en_revision"].includes(actual[0]?.Estado);
}

export async function aprobarVerificacion(idSolicitud: number, idAdmin: number, nota = "Verificación completada satisfactoriamente.") {
  const solicitud = await obtenerSolicitudVerificacionPorId(idSolicitud);
  if (!solicitud || !await esSolicitudActualEditable(solicitud)) return false;

  await client.execute(
    `UPDATE solicitudes_verificacion
     SET Estado = 'aprobado',
         Revisado_Por = ?,
         Notas_Admin = ?,
         Fecha_Revision = NOW()
     WHERE Id_Solicitud_Verificacion = ?`,
    [idAdmin, nota, idSolicitud]
  );

  await client.execute(
    `UPDATE usuarios
     SET Verificado = 1,
         Estado_Verificacion = 'aprobado'
     WHERE Id_Usuario = ?`,
    [solicitud.Id_Usuario]
  );

  return true;
}

export async function solicitarInfoVerificacion(idSolicitud: number, idAdmin: number, infoRequerida: string) {
  const solicitud = await obtenerSolicitudVerificacionPorId(idSolicitud);
  if (!solicitud || !await esSolicitudActualEditable(solicitud)) return false;

  await client.execute(
    `UPDATE solicitudes_verificacion
     SET Estado = 'requiere_informacion',
         Revisado_Por = ?,
         Informacion_Requerida = ?,
         Fecha_Revision = NOW()
     WHERE Id_Solicitud_Verificacion = ?`,
    [idAdmin, infoRequerida, idSolicitud]
  );

  await client.execute(
    `UPDATE usuarios
     SET Verificado = 0,
         Estado_Verificacion = 'requiere_informacion'
     WHERE Id_Usuario = ?`,
    [solicitud.Id_Usuario]
  );

  return true;
}

export async function rechazarVerificacion(idSolicitud: number, idAdmin: number, motivo: string) {
  const solicitud = await obtenerSolicitudVerificacionPorId(idSolicitud);
  if (!solicitud || !await esSolicitudActualEditable(solicitud)) return false;

  await client.execute(
    `UPDATE solicitudes_verificacion
     SET Estado = 'rechazado',
         Revisado_Por = ?,
         Motivo_Rechazo = ?,
         Fecha_Revision = NOW()
     WHERE Id_Solicitud_Verificacion = ?`,
    [idAdmin, motivo, idSolicitud]
  );

  await client.execute(
    `UPDATE usuarios
     SET Verificado = 0,
         Estado_Verificacion = 'rechazado'
     WHERE Id_Usuario = ?`,
    [solicitud.Id_Usuario]
  );

  return true;
}

export async function ponerEnRevisionVerificacion(idSolicitud: number, idAdmin: number, nota = "En proceso de revisión manual.") {
  const solicitud = await obtenerSolicitudVerificacionPorId(idSolicitud);
  if (!solicitud || !await esSolicitudActualEditable(solicitud)) return false;

  await client.execute(
    `UPDATE solicitudes_verificacion
     SET Estado = 'en_revision',
         Revisado_Por = ?,
         Notas_Admin = ?,
         Fecha_Revision = NOW()
     WHERE Id_Solicitud_Verificacion = ?`,
    [idAdmin, nota, idSolicitud]
  );

  await client.execute(
    `UPDATE usuarios
     SET Verificado = 0,
         Estado_Verificacion = 'en_revision'
     WHERE Id_Usuario = ?`,
    [solicitud.Id_Usuario]
  );

  return true;
}
