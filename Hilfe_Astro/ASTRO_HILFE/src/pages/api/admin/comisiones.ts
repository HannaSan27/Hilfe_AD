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

    const [retirosRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(t.amount), 0) AS retirosRegistrados
         FROM transactions t
         JOIN wallets w ON w.id = t.wallet_id
        WHERE w.user_id = ? AND t.type = 'withdraw'`,
      [usuarioId]
    );

    const [detalleRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.Id_Solicitud, s.Id_Cliente, s.Id_Trabajador,
              DATE_FORMAT(s.Fecha_Servicio, '%Y-%m-%d') AS fecha,
              TIME_FORMAT(s.Hora_Servicio, '%H:%i') AS hora,
              sv.Titulo AS servicio, sv.Precio AS precioServicio,
              uc.Nombre AS cliente, ut.Nombre AS trabajador,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                         JOIN wallets w ON w.id = t.wallet_id
                        WHERE w.user_id = s.Id_Cliente AND t.solicitud_id = s.Id_Solicitud AND t.type = 'payment'), 0) AS pagosCliente,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                         JOIN wallets w ON w.id = t.wallet_id
                        WHERE w.user_id = s.Id_Cliente AND t.solicitud_id = s.Id_Solicitud AND t.type = 'refund'), 0) AS reembolsos,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                         JOIN wallets w ON w.id = t.wallet_id
                        WHERE w.user_id = s.Id_Trabajador AND t.solicitud_id = s.Id_Solicitud
                          AND t.type = 'deposit' AND t.description LIKE 'Pago por:%'), 0) AS pagoTrabajador
         FROM solicitudes s
         JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
         LEFT JOIN usuarios uc ON uc.Id_Usuario = s.Id_Cliente
         LEFT JOIN usuarios ut ON ut.Id_Usuario = s.Id_Trabajador
        WHERE s.Estado_Solicitudes = 'finalizado'
        ORDER BY s.Id_Solicitud DESC
        LIMIT 100`
    );

    const redondear = (monto: number) => Math.round(monto * 100) / 100;
    const servicios = detalleRows.map((item) => {
      const pagosNetosCliente = Math.max(0, Number(item.pagosCliente || 0) - Number(item.reembolsos || 0));
      const comisionClienteServicio = redondear(pagosNetosCliente * 0.05 / 1.05);
      const comisionTrabajadorServicio = redondear(Number(item.pagoTrabajador || 0) * 0.05 / 0.95);
      return {
        id: Number(item.Id_Solicitud),
        servicio: String(item.servicio || 'Servicio'),
        cliente: String(item.cliente || `Cliente #${item.Id_Cliente}`),
        trabajador: String(item.trabajador || `Trabajador #${item.Id_Trabajador}`),
        fecha: String(item.fecha || ''),
        hora: String(item.hora || ''),
        precioServicio: Number(item.precioServicio || 0),
        pagoClienteNeto: redondear(pagosNetosCliente),
        devolucionCliente: redondear(Number(item.reembolsos || 0)),
        pagoTrabajador: redondear(Number(item.pagoTrabajador || 0)),
        comisionCliente: comisionClienteServicio,
        comisionTrabajador: comisionTrabajadorServicio,
        comisionTotal: redondear(comisionClienteServicio + comisionTrabajadorServicio),
      };
    }).filter((item) => item.comisionTotal > 0);

    const comisionCliente = Number(rows[0]?.comisionCliente || 0);
    const comisionTrabajador = Number(rows[0]?.comisionTrabajador || 0);
    return Response.json({
      ok: true,
      comisionCliente: Math.round(comisionCliente * 100) / 100,
      comisionTrabajador: Math.round(comisionTrabajador * 100) / 100,
      comisionTotal: Math.round((comisionCliente + comisionTrabajador) * 100) / 100,
      serviciosConMovimiento: Number(rows[0]?.serviciosConMovimiento || 0),
      retirosRegistrados: Number(retirosRows[0]?.retirosRegistrados || 0),
      servicios,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al consultar comisiones del panel administrativo:', error);
    return Response.json({ ok: false, mensaje: 'No se pudieron cargar las comisiones.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
