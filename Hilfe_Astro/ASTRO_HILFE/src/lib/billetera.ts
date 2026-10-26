import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './db';

const FEE_CLIENTE = 0.05;
const FEE_TRABAJADOR = 0.05;
const MAX_RECARGA = 5_000_000;
const BANCOS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Nequi', 'Daviplata'];

type Tipo = 'deposit' | 'withdraw' | 'payment' | 'refund';
const r2 = (n: number) => Math.round(n * 100) / 100;

/* ---------- helpers ---------- */
async function conTransaccion<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const res = await fn(conn);
    await conn.commit();
    return res;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function walletId(conn: PoolConnection, userId: number): Promise<number> {
  await conn.query('INSERT IGNORE INTO wallets (user_id) VALUES (?)', [userId]);
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM wallets WHERE user_id = ? FOR UPDATE', [userId]
  );
  return rows[0].id as number;
}

async function saldoDe(conn: PoolConnection, userId: number): Promise<number> {
  const wid = await walletId(conn, userId);
  const [rows] = await conn.query<RowDataPacket[]>('SELECT balance FROM wallets WHERE id = ?', [wid]);
  return Number(rows[0].balance);
}

async function mover(
  conn: PoolConnection,
  userId: number,
  tipo: Tipo,
  monto: number,
  descripcion: string,
  solicitudId: number | null = null
) {
  const wid = await walletId(conn, userId);
  const signo = tipo === 'deposit' || tipo === 'refund' ? 1 : -1;
  await conn.query(
    `INSERT INTO transactions (wallet_id, solicitud_id, type, amount, description, status)
     VALUES (?, ?, ?, ?, ?, 'completed')`,
    [wid, solicitudId, tipo, monto, descripcion]
  );
  await conn.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [signo * monto, wid]);
}

/* ---------- lectura ---------- */
export async function obtenerBilletera(userId: number, limite = 20) {
  await pool.query('INSERT IGNORE INTO wallets (user_id) VALUES (?)', [userId]);

  const [walletRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, balance FROM wallets WHERE user_id = ?', [userId]
  );
  const wallet = walletRows[0];

  const [movs] = await pool.query<RowDataPacket[]>(
    `SELECT id, type, amount, description, status, created_at
       FROM transactions WHERE wallet_id = ?
      ORDER BY created_at DESC, id DESC LIMIT ?`,
    [wallet.id, limite]
  );
  return { saldo: Number(wallet.balance), movimientos: movs };
}

/* ---------- recarga / retiro de demostración ---------- */
export async function recargar(userId: number, monto: number, banco: string) {
  if (!Number.isFinite(monto) || monto <= 0 || monto > MAX_RECARGA) throw new Error('MONTO_INVALIDO');
  if (!BANCOS.includes(banco)) throw new Error('BANCO_INVALIDO');

  return conTransaccion(async (conn) => {
    await mover(conn, userId, 'deposit', monto, `Recarga simulada · ${banco}`);
    return { monto, simulada: true };
  });
}

export async function retirar(
  userId: number,
  monto: number,
  destino: string
) {
  if (!Number.isFinite(monto) || monto <= 0) throw new Error('MONTO_INVALIDO');
  const destinoLimpio = String(destino || '').trim();
  if (destinoLimpio.length < 4 || destinoLimpio.length > 120 || !/^[\p{L}\p{N}._@+\- ]+$/u.test(destinoLimpio)) {
    throw new Error('DESTINO_INVALIDO');
  }
  const destinoVisible = destinoLimpio.length > 4 ? `••••${destinoLimpio.slice(-4)}` : destinoLimpio;
  return conTransaccion(async (conn) => {
    if ((await saldoDe(conn, userId)) < monto) throw new Error('SALDO_INSUFICIENTE');
    await mover(conn, userId, 'withdraw', monto, `Retiro simulado a ${destinoVisible}`);
    return { monto, simulada: true, destino: destinoVisible };
  });
}

/* ---------- comisión de la plataforma en la billetera administradora ---------- */
async function adminPrincipal(conn: PoolConnection): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT Id_Usuario FROM usuarios WHERE Id_Rol = 1 ORDER BY Id_Usuario ASC LIMIT 1'
  );
  if (!rows[0]) throw new Error('ADMIN_NO_EXISTE');
  return Number(rows[0].Id_Usuario);
}

/** Acredita una sola vez la comisión de los servicios ya finalizados. */
export async function sincronizarComisionesAdmin(adminId: number) {
  return conTransaccion(async (conn) => {
    const principal = await adminPrincipal(conn);
    if (principal !== adminId) throw new Error('NO_AUTORIZADO');

    const [solicitudes] = await conn.query<RowDataPacket[]>(
      `SELECT s.Id_Solicitud, s.Id_Cliente, s.Id_Trabajador
         FROM solicitudes s
        WHERE s.Estado_Solicitudes = 'finalizado'
        ORDER BY s.Id_Solicitud ASC`
    );

    for (const item of solicitudes) {
      const [bloqueadas] = await conn.query<RowDataPacket[]>(
        "SELECT Id_Solicitud FROM solicitudes WHERE Id_Solicitud = ? AND Estado_Solicitudes = 'finalizado' FOR UPDATE",
        [item.Id_Solicitud]
      );
      if (!bloqueadas.length) continue;

      const [existentes] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM transactions
          WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = ?)
            AND solicitud_id = ? AND type = 'deposit'
            AND description = 'Comisión de plataforma por servicio'
          LIMIT 1 FOR UPDATE`,
        [adminId, item.Id_Solicitud]
      );
      if (existentes.length) continue;

      const [totales] = await conn.query<RowDataPacket[]>(
        `SELECT
            COALESCE(SUM(CASE WHEN w.user_id = ? AND t.type = 'payment' THEN t.amount ELSE 0 END), 0) AS pagosCliente,
            COALESCE(SUM(CASE WHEN w.user_id = ? AND t.type = 'refund' THEN t.amount ELSE 0 END), 0) AS reembolsos,
            COALESCE(SUM(CASE WHEN w.user_id = ? AND t.type = 'deposit' AND t.description LIKE 'Pago por:%' THEN t.amount ELSE 0 END), 0) AS pagoTrabajador
           FROM transactions t
           JOIN wallets w ON w.id = t.wallet_id
          WHERE t.solicitud_id = ?`,
        [item.Id_Cliente, item.Id_Cliente, item.Id_Trabajador, item.Id_Solicitud]
      );
      const pagosNetosCliente = Math.max(0, Number(totales[0]?.pagosCliente || 0) - Number(totales[0]?.reembolsos || 0));
      const comision = r2(
        pagosNetosCliente * FEE_CLIENTE / (1 + FEE_CLIENTE) +
        Number(totales[0]?.pagoTrabajador || 0) * FEE_TRABAJADOR / (1 - FEE_TRABAJADOR)
      );
      if (comision > 0) {
        await mover(conn, adminId, 'deposit', comision, 'Comisión de plataforma por servicio', Number(item.Id_Solicitud));
      }
    }

    return saldoDe(conn, adminId);
  });
}

/* ---------- pago de un servicio ---------- */
export async function pagarSolicitud(solicitudId: number, clienteId: number) {
  return conTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
     `SELECT s.Id_Cliente, s.Id_Trabajador, s.Estado_Solicitudes, sv.Precio, sv.Titulo
        FROM solicitudes s JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
       WHERE s.Id_Solicitud = ? FOR UPDATE`,
      [solicitudId]
    );
    const sol = rows[0];
    if (!sol) throw new Error('NO_EXISTE');
    if (sol.Estado_Solicitudes !== 'trabajo_realizado') throw new Error('NO_PAGABLE');
    if (Number(sol.Id_Cliente) !== clienteId) throw new Error('NO_AUTORIZADO');

    const precio = Number(sol.Precio);
    const totalCliente = r2(precio * (1 + FEE_CLIENTE));
    const netoTrabajador = r2(precio * (1 - FEE_TRABAJADOR));
    const [pagos] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(amount), 0) AS abonado FROM transactions WHERE solicitud_id = ? AND type = 'payment'",
      [solicitudId]
    );
    const abonado = Math.min(totalCliente, Number(pagos[0]?.abonado || 0));
    const saldoPendiente = r2(Math.max(0, totalCliente - abonado));

    if ((await saldoDe(conn, clienteId)) < saldoPendiente) throw new Error('SALDO_INSUFICIENTE');
    if (saldoPendiente > 0) {
      await mover(conn, clienteId, 'payment', saldoPendiente, `Saldo final: ${sol.Titulo} (incluye 5% Hilf'e)`, solicitudId);
    }
    await mover(conn, sol.Id_Trabajador, 'deposit', netoTrabajador, `Pago por: ${sol.Titulo} (−5% Hilf'e)`, solicitudId);
    const idAdmin = await adminPrincipal(conn);
    const comisionHilfe = r2(totalCliente - netoTrabajador);
    if (comisionHilfe > 0) {
      await mover(conn, idAdmin, 'deposit', comisionHilfe, 'Comisión de plataforma por servicio', solicitudId);
    }
    await conn.query(
      "UPDATE solicitudes SET Estado_Solicitudes = 'finalizado' WHERE Id_Solicitud = ?",
      [solicitudId]
    );
    return { totalCliente, abonado, saldoPendiente, netoTrabajador, comisionHilfe };
  });
}

/* ---------- cancelación: reembolso al cliente ---------- */
const CANCELABLES = ['pendiente', 'aceptado', 'en_proceso', 'rumbo_a_ubicacion'];

export async function cancelarSolicitud(solicitudId: number, usuarioId: number) {
  return conTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT s.Id_Cliente, s.Id_Trabajador, s.Estado_Solicitudes, sv.Precio, sv.Titulo
         FROM solicitudes s JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
        WHERE s.Id_Solicitud = ? FOR UPDATE`, [solicitudId]
    );
    const sol = rows[0];
    if (!sol) throw new Error('NO_EXISTE');
    if (usuarioId !== sol.Id_Cliente && usuarioId !== sol.Id_Trabajador) throw new Error('NO_AUTORIZADO');

    if (sol.Estado_Solicitudes === 'rechazado') throw new Error('YA_CANCELADA');
    if (!CANCELABLES.includes(sol.Estado_Solicitudes)) throw new Error('NO_CANCELABLE');

    const [txs] = await conn.query<RowDataPacket[]>(
      'SELECT type, amount FROM transactions WHERE solicitud_id = ?', [solicitudId]
    );
    if (txs.some(t => t.type === 'refund')) throw new Error('YA_CANCELADA');

    const reembolso = r2(txs.filter(t => t.type === 'payment').reduce((suma, t) => suma + Number(t.amount), 0));
    if (reembolso > 0) {
      await mover(conn, sol.Id_Cliente, 'refund', reembolso, `Reembolso del abono por cancelación: ${sol.Titulo}`, solicitudId);
    }

    await conn.query(
      "UPDATE solicitudes SET Estado_Solicitudes = 'rechazado' WHERE Id_Solicitud = ?",
      [solicitudId]
    );

    return { reembolso };
  });
  
}
/* ---------- servicios pendientes de pago (cliente) ---------- */
export async function obtenerPendientesPago(clienteId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.Id_Solicitud, sv.Titulo, sv.Precio, u.Nombre AS Trabajador,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                       JOIN wallets w ON w.id = t.wallet_id
                      WHERE w.user_id = s.Id_Cliente AND t.solicitud_id = s.Id_Solicitud
                        AND t.type = 'payment'), 0) AS Abonado
       FROM solicitudes s
       JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
       JOIN usuarios u ON u.Id_Usuario = s.Id_Trabajador
      WHERE s.Id_Cliente = ? AND s.Estado_Solicitudes = 'trabajo_realizado'
      ORDER BY s.Id_Solicitud DESC`,
    [clienteId]
  );
  return rows.map((r) => {
    const total = r2(Number(r.Precio) * (1 + FEE_CLIENTE));
    const abonado = Math.min(total, Number(r.Abonado || 0));
    return {
      id: r.Id_Solicitud as number,
      titulo: (r.Titulo ?? 'Servicio') as string,
      trabajador: (r.Trabajador ?? '') as string,
      precio: Number(r.Precio),
      total,
      abonado,
      saldoPendiente: r2(Math.max(0, total - abonado)),
    };
  });
}
