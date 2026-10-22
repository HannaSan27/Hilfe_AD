import client from "./conexion.ts";

// fotos = nombres de archivo; se guardan como lista JSON en Foto_Calificacion
export async function crearCalificacion(
  idSolicitud: number,
  puntaje: number,
  comentario: string | null,
  fotos: string[] = []
) {
  const resultado = await client.execute(
    `INSERT INTO calificaciones (Id_Solicitud, Puntaje, Comentario, Fecha_Calificacion, Foto_Calificacion)
     VALUES (?, ?, ?, NOW(), ?)`,
    [idSolicitud, puntaje, comentario, fotos.length ? JSON.stringify(fotos) : null]
  );
  return resultado;
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
    `SELECT c.Id_Calificaciones, c.Puntaje, c.Comentario, c.Fecha_Calificacion, c.Foto_Calificacion
     FROM calificaciones c
     INNER JOIN solicitudes s ON c.Id_Solicitud = s.Id_Solicitud
     WHERE s.Id_Trabajador = ?
     ORDER BY c.Fecha_Calificacion DESC`,
    [idTrabajador]
  );
  return resultado;
}