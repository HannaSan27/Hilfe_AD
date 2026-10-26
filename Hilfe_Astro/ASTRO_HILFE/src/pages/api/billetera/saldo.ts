import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { getUsuarioId } from '../../../lib/sesion';
import { obtenerBilletera, sincronizarComisionesAdmin } from '../../../lib/billetera';
import { pool } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false, error: 'NO_SESION' }, { status: 401 });

  try {
    const [usuarios] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Rol FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [uid]
    );
    if (Number(usuarios[0]?.Id_Rol) === 1) await sincronizarComisionesAdmin(uid);
    const { saldo } = await obtenerBilletera(uid, 1);
    return Response.json({ ok: true, saldo, uid }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al consultar saldo:', error);
    return Response.json({ ok: false, error: 'NO_SE_PUDO_CARGAR_SALDO' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
