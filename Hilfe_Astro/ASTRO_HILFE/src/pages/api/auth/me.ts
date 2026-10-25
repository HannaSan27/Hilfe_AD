import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false }, { status: 401 });

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT Id_Usuario, Id_Rol, Nombre FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [uid]
  );
  const u = rows[0];
  if (!u) return Response.json({ ok: false }, { status: 401 });

  return Response.json(
    { ok: true, usuario: { id: u.Id_Usuario, rol: u.Id_Rol, nombre: u.Nombre } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
};