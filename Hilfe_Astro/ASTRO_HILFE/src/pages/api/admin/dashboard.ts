import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const usuarioId = getUsuarioId(cookies);
  if (!usuarioId) {
    return Response.json({ ok: false, mensaje: 'Inicia sesión para consultar el dashboard.' }, { status: 401 });
  }

  try {
    const [roles] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Rol FROM usuarios WHERE Id_Usuario = ? LIMIT 1',
      [usuarioId]
    );
    if (Number(roles[0]?.Id_Rol) !== 1) {
      return Response.json({ ok: false, mensaje: 'Solo administración puede consultar estos datos.' }, { status: 403 });
    }

    const [[filasTotales], [citas]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT
           (SELECT COUNT(*) FROM usuarios) AS totalUsuarios,
           (SELECT COUNT(*) FROM usuarios WHERE Id_Rol = 2) AS totalTrabajadores,
           (SELECT COUNT(*) FROM solicitudes
             WHERE Fecha_Servicio >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
               AND Fecha_Servicio < DATE_ADD(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
           ) AS citasMes,
           (SELECT ROUND(AVG(Puntaje), 1) FROM calificaciones) AS califPromedio,
           (SELECT COUNT(*) FROM calificaciones) AS totalCalificaciones`
      ),
      pool.query<RowDataPacket[]>(
        `SELECT uc.Nombre AS cliente, ut.Nombre AS trabajador, sv.Titulo AS servicio,
                DATE_FORMAT(s.Fecha_Servicio, '%Y-%m-%d') AS fecha,
                s.Estado_Solicitudes AS estado
           FROM solicitudes s
           LEFT JOIN usuarios uc ON uc.Id_Usuario = s.Id_Cliente
           LEFT JOIN usuarios ut ON ut.Id_Usuario = s.Id_Trabajador
           LEFT JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
          ORDER BY s.Id_Solicitud DESC
          LIMIT 5`
      ),
    ]);
    const totales = filasTotales[0];

    return Response.json({
      ok: true,
      stats: {
        totalUsuarios: Number(totales[0]?.totalUsuarios || 0),
        totalTrabajadores: Number(totales[0]?.totalTrabajadores || 0),
        citasMes: Number(totales[0]?.citasMes || 0),
        califPromedio: totales[0]?.totalCalificaciones ? Number(totales[0]?.califPromedio || 0) : null,
      },
      citas,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al cargar el dashboard administrativo:', error);
    return Response.json(
      { ok: false, mensaje: 'No se pudieron consultar los datos del dashboard.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
};
