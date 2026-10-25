import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.Id_Solicitud AS id, sv.Titulo AS servicio, sv.Precio AS precio,
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

  const citas = rows.map((r) => ({
    ...r,
    precio: Number(r.precio),
    total: Math.round(Number(r.precio) * 1.05 * 100) / 100,
  }));
  return Response.json({ ok: true, citas }, { headers: { 'Cache-Control': 'no-store' } });
};