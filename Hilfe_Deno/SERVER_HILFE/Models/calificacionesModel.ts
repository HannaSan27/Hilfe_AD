import client from "./conexion.ts";

export async function crearCalificacion(idSolicitud: number, puntaje: number, comentario: string) {
  const resultado = await client.execute(
    "INSERT INTO calificaciones (Id_Solicitud, Puntaje, Comentario, Fecha_Calificacion) VALUES (?, ?, ?, NOW())",
    [idSolicitud, puntaje, comentario]
  );
  return resultado;
}

// Lista las calificaciones de un trabajador 
export async function listarCalificacionesPorTrabajador(idTrabajador: number) {
  const resultado = await client.query(
    `SELECT c.Id_Calificaciones, c.Puntaje, c.Comentario, c.Fecha_Calificacion
     FROM calificaciones c
     INNER JOIN solicitudes s ON c.Id_Solicitud = s.Id_Solicitud
     WHERE s.Id_Trabajador = ?
     ORDER BY c.Fecha_Calificacion DESC`,
    [idTrabajador]
  );
  return resultado;
}