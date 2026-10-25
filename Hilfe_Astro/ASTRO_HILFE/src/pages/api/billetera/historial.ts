import type { APIRoute } from 'astro';
import { getUsuarioId } from '../../../lib/sesion';
import { obtenerBilletera } from '../../../lib/billetera';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const { movimientos } = await obtenerBilletera(uid, 200);
  const lista = movimientos.map((m: any) => {
    const entra = m.type === 'deposit' || m.type === 'refund';
    return {
      id: m.id,
      titulo: m.description ?? (entra ? 'Ingreso' : 'Egreso'),
      fecha: new Date(m.created_at).toISOString(),
      monto: entra ? Number(m.amount) : -Number(m.amount),
    };
  });
  return Response.json({ ok: true, movimientos: lista }, { headers: { 'Cache-Control': 'no-store' } });
};