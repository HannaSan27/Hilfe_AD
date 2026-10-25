import type { APIRoute } from 'astro';
import { getUsuarioId } from '../../../lib/sesion';
import { obtenerBilletera } from '../../../lib/billetera';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const { saldo } = await obtenerBilletera(uid, 1);
  return Response.json({ ok: true, saldo, uid }, { headers: { 'Cache-Control': 'no-store' } });
};