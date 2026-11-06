import client, { nuevaConexion } from "./conexion.ts";

// fotos = nombres de archivo; se guardan como lista JSON en Foto_Calificacion
export async function crearCalificacion(
  idCliente: number,
  idSolicitud: number,
  puntaje: number,
  comentario: string | null,
  fotos: string[] = []
) {
  const db = await nuevaConexion();
  let enTransaccion = false;
  try {
    await db.execute("START TRANSACTION");
    enTransaccion = true;
    const solicitudes = await db.query(
      "SELECT Id_Cliente, Estado_Solicitudes FROM solicitudes WHERE Id_Solicitud = ? FOR UPDATE",
      [idSolicitud]
    );
    const solicitud = solicitudes[0];
    if (!solicitud) throw new Error("SOLICITUD_NO_ENCONTRADA");
    if (Number(solicitud.Id_Cliente) !== Number(idCliente)) throw new Error("NO_AUTORIZADO");
    if (solicitud.Estado_Solicitudes !== "finalizado") throw new Error("SERVICIO_NO_FINALIZADO");

    const existentes = await db.query(
      "SELECT Id_Calificaciones FROM calificaciones WHERE Id_Solicitud = ? LIMIT 1",
      [idSolicitud]
    );
    if (existentes.length) throw new Error("SERVICIO_YA_CALIFICADO");

    const resultado = await db.execute(
      `INSERT INTO calificaciones (Id_Solicitud, Puntaje, Comentario, Fecha_Calificacion, Foto_Calificacion)
       VALUES (?, ?, ?, NOW(), ?)`,
      [idSolicitud, puntaje, comentario, fotos.length ? JSON.stringify(fotos) : null]
    );
    await db.execute("COMMIT");
    enTransaccion = false;
    return resultado;
  } catch (error) {
    if (enTransaccion) await db.execute("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await db.close().catch(() => {});
  }
}

// Datos de la solicitud para validar antes de calificar
export async function obtenerSolicitudParaCalificar(idSolicitud: number) {
  const resultado = await client.query(
    `SELECT sol.Id_Cliente, sol.Estado_Solicitudes,
            (SELECT COUNT(*) FROM calificaciones c WHERE c.Id_Solicitud = sol.Id_Solicitud) AS Total_Calificaciones
     FROM solicitudes sol
     WHERE sol.Id_Solicitud = ?`,
    [idSolicitud]
  );
  return resultado[0] ?? null;
}

// Valor crudo de Foto_Calificacion de una calificación
export async function obtenerFotosCalificacion(idCalificacion: number) {
  const resultado = await client.query(
    "SELECT Foto_Calificacion FROM calificaciones WHERE Id_Calificaciones = ?",
    [idCalificacion]
  );
  return resultado[0]?.Foto_Calificacion ?? null;
}

// Lista las calificaciones de un trabajador
export async function listarCalificacionesPorTrabajador(idTrabajador: number) {
  const resultado = await client.query(
    `SELECT c.Id_Calificaciones, c.Puntaje, c.Comentario, c.Fecha_Calificacion, c.Foto_Calificacion,
            s.Id_Servicio, sv.Titulo AS Titulo_Servicio, uc.Nombre AS Nombre_Cliente
     FROM calificaciones c
     INNER JOIN solicitudes s ON c.Id_Solicitud = s.Id_Solicitud
     INNER JOIN servicios sv ON s.Id_Servicio = sv.Id_Servicio
     INNER JOIN usuarios uc ON s.Id_Cliente = uc.Id_Usuario
     WHERE s.Id_Trabajador = ?
     ORDER BY c.Fecha_Calificacion DESC`,
    [idTrabajador]
  );
  return resultado;
}
