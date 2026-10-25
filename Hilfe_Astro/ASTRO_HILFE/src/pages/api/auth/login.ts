import type { APIRoute } from 'astro';
import type { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { pool } from '../../../lib/db';

export const prerender = false;

const DESTINOS: Record<number, string> = {
  1: '/admin/admin',
  2: '/trabajador',
  3: '/cliente',
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const { correo, contrasena, recordar } = await request.json().catch(() => ({}));

  if (!correo || !contrasena) {
    return Response.json({ ok: false, mensaje: 'Completa correo y contraseña.' }, { status: 400 });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT Id_Usuario, Id_Rol, Nombre, Contrasena FROM usuarios WHERE Correo = ? LIMIT 1',
    [String(correo).trim().toLowerCase()]
  );
  const u = rows[0];

  // $2y$ (PHP) -> $2a$ para que bcryptjs lo entienda; $2b$ funciona directo
  const hash = u ? String(u.Contrasena).replace(/^\$2y\$/, '$2a$') : '';
  const valido = u ? await bcrypt.compare(String(contrasena), hash) : false;

  if (!valido) {
    return Response.json({ ok: false, mensaje: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  cookies.set('usuario_id', String(u.Id_Usuario), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: recordar ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
  });

  return Response.json({
    ok: true,
    destino: DESTINOS[u.Id_Rol] ?? '/',
    usuario: { id: u.Id_Usuario, nombre: u.Nombre, rol: u.Id_Rol },
  });
};