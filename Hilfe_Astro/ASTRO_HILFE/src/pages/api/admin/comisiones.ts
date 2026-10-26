import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';
import { sincronizarComisionesAdmin } from '../../../lib/billetera';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const usuarioId = getUsuarioId(cookies);
  if (!usuarioId) {
    return Response.json({ ok: false, mensaje: 'Inicia sesión para consultar las comisiones.' }, { status: 401 });
  }

  try {
    const [roles] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Rol FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [usuarioId]
    );
    if (Number(roles[0]?.Id_Rol) !== 1) {
      return Response.json({ ok: false, mensaje: 'Solo el administrador puede consultar las comisiones.' }, { status: 403 });
    }
    await sincronizarComisionesAdmin(usuarioId);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
          COALESCE(SUM(GREATEST(0, pagos - reembolsos) * 0.05 / 1.05), 0) AS comisionCliente,
          COALESCE(SUM(pagosTrabajador * 0.05 / 0.95), 0) AS comisionTrabajador,
          COALESCE(SUM(CASE WHEN pagos > reembolsos OR pagosTrabajador > 0 THEN 1 ELSE 0 END), 0) AS serviciosConMovimiento
       FROM (
         SELECT s.Id_Solicitud,
                COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0) AS pagos,
                COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0) AS reembolsos,
                COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.description LIKE 'Pago por:%' THEN t.amount ELSE 0 END), 0) AS pagosTrabajador
           FROM solicitudes s
           LEFT JOIN transactions t ON t.solicitud_id = s.Id_Solicitud
          WHERE s.Estado_Solicitudes = 'finalizado'
          GROUP BY s.Id_Solicitud
       ) movimientos`);

    const comisionCliente = Number(rows[0]?.comisionCliente || 0);
    const comisionTrabajador = Number(rows[0]?.comisionTrabajador || 0);
    return Response.json({
      ok: true,
      comisionCliente: Math.round(comisionCliente * 100) / 100,
      comisionTrabajador: Math.round(comisionTrabajador * 100) / 100,
      comisionTotal: Math.round((comisionCliente + comisionTrabajador) * 100) / 100,
      serviciosConMovimiento: Number(rows[0]?.serviciosConMovimiento || 0),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al consultar comisiones del panel administrativo:', error);
    return Response.json({ ok: false, mensaje: 'No se pudieron cargar las comisiones.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
