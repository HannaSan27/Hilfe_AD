import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from './db';
import { enviarCodigo } from './correo';

const FEE_CLIENTE = 0.05;
const FEE_TRABAJADOR = 0.05;
const MAX_RECARGA = 5_000_000;
const BANCOS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Nequi', 'Daviplata'];

type Tipo = 'deposit' | 'withdraw' | 'payment' | 'refund';
const r2 = (n: number) => Math.round(n * 100) / 100;

const SECRET = import.meta.env.CODE_SECRET ?? 'cambia-este-secreto-en-el-env';

const hashCodigo = (userId: number, codigo: string) =>
  createHmac('sha256', SECRET).update(`${userId}:${codigo}`).digest('hex');

const enmascarar = (c: string) => {
  const [u, d] = c.split('@');
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(u.length - 2, 1))}@${d}`;
};

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

/* ---------- verificación por código ---------- */
export async function solicitarCodigo(userId: number, accion: string, monto: number, banco: string) {
  if (accion !== 'recargar' && accion !== 'retirar') throw new Error('RUTA_INVALIDA');
  if (!Number.isFinite(monto) || monto <= 0 || (accion === 'recargar' && monto > MAX_RECARGA)) {
    throw new Error('MONTO_INVALIDO');
  }
  if (!BANCOS.includes(banco)) throw new Error('BANCO_INVALIDO');

  if (accion === 'retirar') {
    const [w] = await pool.query<RowDataPacket[]>(
      'SELECT balance FROM wallets WHERE user_id = ?', [userId]
    );
    if (!w[0] || Number(w[0].balance) < monto) throw new Error('SALDO_INSUFICIENTE');
  }

  const [reciente] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM codigos_verificacion WHERE user_id = ? AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1',
    [userId]
  );
  if (reciente.length) throw new Error('ESPERA');

  const [u] = await pool.query<RowDataPacket[]>(
    'SELECT Correo, Nombre FROM usuarios WHERE Id_Usuario = ?', [userId]
  );
  if (!u[0]?.Correo) throw new Error('NO_EXISTE');

  const codigo = String(randomInt(100000, 1000000));
  await pool.query('UPDATE codigos_verificacion SET usado = 1 WHERE user_id = ? AND usado = 0', [userId]);
  await pool.query(
    `INSERT INTO codigos_verificacion (user_id, accion, monto, banco, codigo_hash, expira_at)
     VALUES (?, ?, ?, ?, ?, NOW() + INTERVAL 10 MINUTE)`,
    [userId, accion, monto, banco, hashCodigo(userId, codigo)]
  );

  await enviarCodigo(u[0].Correo, u[0].Nombre ?? '', codigo, accion, monto);
  return { correo: enmascarar(u[0].Correo) };
}

async function consumirCodigo(
  userId: number,
  accion: string,
  monto: number,
  banco: string,
  codigo?: string
) {
  if (!codigo || !/^\d{6}$/.test(codigo)) throw new Error('CODIGO_INVALIDO');

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, codigo_hash, intentos, monto, banco, (expira_at < NOW()) AS vencido
       FROM codigos_verificacion
      WHERE user_id = ? AND accion = ? AND usado = 0
      ORDER BY id DESC LIMIT 1`,
    [userId, accion]
  );
  const c = rows[0];
  if (!c) throw new Error('CODIGO_INVALIDO');
  if (c.vencido) throw new Error('CODIGO_EXPIRADO');
  if (c.intentos >= 5) throw new Error('DEMASIADOS_INTENTOS');

  const mismoPedido = Number(c.monto) === monto && (c.banco ?? '') === banco;
  const a = Buffer.from(hashCodigo(userId, codigo));
  const b = Buffer.from(String(c.codigo_hash));
  const correcto = a.length === b.length && timingSafeEqual(a, b);

  if (!mismoPedido || !correcto) {
    await pool.query('UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = ?', [c.id]);
    throw new Error('CODIGO_INVALIDO');
  }

  const [r] = await pool.query<ResultSetHeader>(
    'UPDATE codigos_verificacion SET usado = 1 WHERE id = ? AND usado = 0', [c.id]
  );
  if (r.affectedRows !== 1) throw new Error('CODIGO_INVALIDO');
}

/* ---------- recarga / retiro (con código) ---------- */
export async function recargar(userId: number, monto: number, banco: string, codigo?: string) {
  if (!Number.isFinite(monto) || monto <= 0 || monto > MAX_RECARGA) throw new Error('MONTO_INVALIDO');
  if (!BANCOS.includes(banco)) throw new Error('BANCO_INVALIDO');
  await consumirCodigo(userId, 'recargar', monto, banco, codigo);

  return conTransaccion(async (conn) => {
    await mover(conn, userId, 'deposit', monto, `Recarga vía PSE · ${banco}`);
    return { monto };
  });
}

export async function retirar(
  userId: number,
  monto: number,
  banco: string,
  ultimos?: string,
  codigo?: string
) {
  if (!Number.isFinite(monto) || monto <= 0) throw new Error('MONTO_INVALIDO');
  if (!BANCOS.includes(banco)) throw new Error('BANCO_INVALIDO');
  await consumirCodigo(userId, 'retirar', monto, banco, codigo);

  const fin = ultimos && /^\d{4}$/.test(ultimos) ? ` ····${ultimos}` : '';
  return conTransaccion(async (conn) => {
    if ((await saldoDe(conn, userId)) < monto) throw new Error('SALDO_INSUFICIENTE');
    await mover(conn, userId, 'withdraw', monto, `Retiro a ${banco}${fin}`);
    return { monto };
  });
}

/* ---------- pago de un servicio ---------- */
export async function pagarSolicitud(solicitudId: number, clienteId: number) {
  return conTransaccion(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
     `SELECT s.Id_Cliente, s.Id_Trabajador, s.Estado_Solicitudes, sv.Precio, sv.Titulo
   FROM solicitudes s JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
  WHERE s.Id_Solicitud = ? FOR UPDATE`[solicitudId]
    );
    const sol = rows[0];
    if (!sol) throw new Error('NO_EXISTE');
    if (sol.Estado_Solicitudes !== 'trabajo_realizado') throw new Error('NO_PAGABLE');
    if (sol.Id_Cliente !== clienteId) throw new Error('NO_AUTORIZADO');

    const [dup] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM transactions WHERE solicitud_id = ? AND type = 'payment'", [solicitudId]
    );
    if (dup.length) throw new Error('YA_PAGADA');

    const precio = Number(sol.Precio);
    const totalCliente = r2(precio * (1 + FEE_CLIENTE));
    const netoTrabajador = r2(precio * (1 - FEE_TRABAJADOR));

    if ((await saldoDe(conn, clienteId)) < totalCliente) throw new Error('SALDO_INSUFICIENTE');
await mover(conn, clienteId, 'payment', totalCliente, `Pago: ${sol.Titulo} (incluye 5% Hilf'e)`, solicitudId);
await mover(conn, sol.Id_Trabajador, 'deposit', netoTrabajador, `Pago por: ${sol.Titulo} (−5% Hilf'e)`, solicitudId);
await conn.query(
  "UPDATE solicitudes SET Estado_Solicitudes = 'finalizado' WHERE Id_Solicitud = ?",
  [solicitudId]
);
    return { totalCliente, netoTrabajador, comisionHilfe: r2(totalCliente - netoTrabajador) };
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

    let reembolso = 0;
    const deposito = txs.find(t => t.type === 'deposit');
    const pagoCliente = txs.find(t => t.type === 'payment');

    // Solo se mueve dinero si hubo un pago previo
    if (deposito && pagoCliente) {
      reembolso = Number(pagoCliente.amount);
      await mover(conn, sol.Id_Trabajador, 'withdraw', Number(deposito.amount), `Reversa por cancelación: ${sol.Titulo}`, solicitudId);
      await mover(conn, sol.Id_Cliente, 'refund', reembolso, `Reembolso por cancelación: ${sol.Titulo}`, solicitudId);
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
    `SELECT s.Id_Solicitud, sv.Titulo, sv.Precio, u.Nombre AS Trabajador
       FROM solicitudes s
       JOIN servicios sv ON sv.Id_Servicio = s.Id_Servicio
       JOIN usuarios u ON u.Id_Usuario = s.Id_Trabajador
      WHERE s.Id_Cliente = ? AND s.Estado_Solicitudes = 'trabajo_realizado'
      ORDER BY s.Id_Solicitud DESC`,
    [clienteId]
  );
  return rows.map((r) => ({
    id: r.Id_Solicitud as number,
    titulo: (r.Titulo ?? 'Servicio') as string,
    trabajador: (r.Trabajador ?? '') as string,
    precio: Number(r.Precio),
    total: r2(Number(r.Precio) * (1 + FEE_CLIENTE)),
  }));
}