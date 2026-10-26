import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false, mensaje: 'Inicia sesión para consultar tus solicitudes.' }, { status: 401 });

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.Id_Solicitud AS id, sv.Titulo AS servicio, sv.Precio AS precio,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                         JOIN wallets w ON w.id = t.wallet_id
                        WHERE w.user_id = s.Id_Cliente AND t.solicitud_id = s.Id_Solicitud
                          AND t.type = 'payment'), 0) AS abonado,
              u.Nombre AS trabajador, s.Direccion AS direccion,
              DATE_FORMAT(s.Fecha_Servicio, '%d/%m/%Y') AS fecha,
              TIME_FORMAT(s.Hora_Servicio, '%H:%i') AS hora,
              s.Estado_Solicitudes AS estado
         FROM solicitudes s
         JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
         JOIN usuarios u ON u.Id_Usuario = s.Id_Trabajador
        WHERE s.Id_Cliente = ?
        ORDER BY s.Id_Solicitud DESC`,
      [uid]
    );

    const citas = rows.map((r) => {
      const precio = Number(r.precio);
      const total = Math.round(precio * 1.05 * 100) / 100;
      const abonado = Math.min(total, Number(r.abonado || 0));
      return { ...r, precio, total, abonado, saldoPendiente: Math.round(Math.max(0, total - abonado) * 100) / 100 };
    });
    return Response.json({ ok: true, citas }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al cargar solicitudes del cliente:', error);
    return Response.json(
      { ok: false, mensaje: 'No se pudieron consultar las solicitudes. Intenta de nuevo en unos segundos.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
};
