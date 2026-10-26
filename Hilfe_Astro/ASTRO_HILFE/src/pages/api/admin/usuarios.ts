import type { APIRoute, AstroCookies } from 'astro';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../../lib/db';
import { getUsuarioId } from '../../../lib/sesion';

export const prerender = false;

async function adminId(cookies: AstroCookies) {
  const id = getUsuarioId(cookies);
  if (!id) return null;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT Id_Usuario FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = 1 LIMIT 1',
    [id]
  );
  return rows.length ? id : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    if (!await adminId(cookies)) return Response.json({ ok: false, mensaje: 'Acceso solo para administradores.' }, { status: 403 });
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.Id_Usuario, u.Nombre, u.Correo, u.Id_Rol, r.Nombre_Rol,
              u.Ubicacion, u.Estado
         FROM usuarios u
         LEFT JOIN roles r ON r.Id_Rol = u.Id_Rol
        ORDER BY u.Id_Usuario DESC`
    );
    return Response.json({ ok: true, usuarios: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error al listar usuarios para administración:', error);
    return Response.json({ ok: false, mensaje: 'No se pudo cargar la lista de usuarios.' }, { status: 500 });
  }
};

export const PUT: APIRoute = async ({ cookies, request }) => {
  try {
    if (!await adminId(cookies)) return Response.json({ ok: false, mensaje: 'Acceso solo para administradores.' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim().replace(/\s+/g, ' ') : '';
    const correo = typeof body.correo === 'string' ? body.correo.trim().toLowerCase() : '';
    const ubicacion = typeof body.ubicacion === 'string' ? body.ubicacion.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || nombre.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return Response.json({ ok: false, mensaje: 'Revisa el nombre y el correo electrónico.' }, { status: 400 });
    }
    const [duplicados] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Usuario FROM usuarios WHERE Correo = ? AND Id_Usuario <> ? LIMIT 1',
      [correo, id]
    );
    if (duplicados.length) return Response.json({ ok: false, mensaje: 'Ese correo ya pertenece a otra cuenta.' }, { status: 409 });
    const [existentes] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Usuario FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [id]
    );
    if (!existentes.length) return Response.json({ ok: false, mensaje: 'No se encontró el usuario.' }, { status: 404 });
    await pool.execute(
      'UPDATE usuarios SET Nombre = ?, Correo = ?, Ubicacion = ? WHERE Id_Usuario = ?',
      [nombre, correo, ubicacion, id]
    );
    return Response.json({ ok: true, mensaje: 'Usuario actualizado.' });
  } catch (error) {
    console.error('Error al editar usuario:', error);
    return Response.json({ ok: false, mensaje: 'No se pudo guardar el usuario.' }, { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const admin = await adminId(cookies);
    if (!admin) return Response.json({ ok: false, mensaje: 'Acceso solo para administradores.' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0 || typeof body.activo !== 'boolean') {
      return Response.json({ ok: false, mensaje: 'El usuario y el nuevo estado son obligatorios.' }, { status: 400 });
    }
    if (admin === id && !body.activo) {
      return Response.json({ ok: false, mensaje: 'No puedes desactivar tu propia cuenta administrativa.' }, { status: 400 });
    }
    const [existentes] = await pool.query<RowDataPacket[]>(
      'SELECT Id_Usuario FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [id]
    );
    if (!existentes.length) return Response.json({ ok: false, mensaje: 'No se encontró el usuario.' }, { status: 404 });
    await pool.execute(
      'UPDATE usuarios SET Estado = ? WHERE Id_Usuario = ?',
      [body.activo ? 'Activo' : 'Inactivo', id]
    );
    return Response.json({ ok: true, mensaje: 'Estado actualizado.' });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    return Response.json({ ok: false, mensaje: 'No se pudo cambiar el estado del usuario.' }, { status: 500 });
  }
};
