import type { APIRoute } from 'astro';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../../../../lib/db';
import { getUsuarioId } from '../../../../lib/sesion';

export const prerender = false;

const json = (data: object, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function esAdmin(cookies: any): Promise<number | null> {
  const uid = getUsuarioId(cookies);
  if (!uid) return null;
  const [r] = await pool.query<RowDataPacket[]>(
    'SELECT Id_Rol FROM usuarios WHERE Id_Usuario = ? LIMIT 1', [uid]
  );
  return r[0]?.Id_Rol === 1 ? uid : null;
}

const enmascarar = (n: string) => '•'.repeat(Math.max(n.length - 4, 0)) + n.slice(-4);

const ESTADOS = ['pendiente', 'en_revision', 'aprobado', 'requiere_informacion', 'rechazado'];

/* ---------- GET: listado y detalle ---------- */
export const GET: APIRoute = async ({ params, url, cookies }) => {
  const admin = await esAdmin(cookies);
  if (!admin) return json({ mensaje: 'No autorizado.' }, 403);

  const ruta = params.ruta ?? '';

  // Detalle: /api/admin/verificaciones/5
  if (/^\d+$/.test(ruta)) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT v.*, DATE_FORMAT(v.Fecha_Expedicion_Documento, '%Y-%m-%d') AS Fecha_Expedicion_Documento,
              u.Nombre AS Nombre_Usuario, u.Correo AS Correo_Usuario, u.Telefono AS Telefono_Usuario, u.Id_Rol,
              r.Nombre AS Nombre_Admin_Revisor
         FROM solicitudes_verificacion v
         JOIN usuarios u ON u.Id_Usuario = v.Id_Usuario
         LEFT JOIN usuarios r ON r.Id_Usuario = v.Revisado_Por
        WHERE v.Id_Solicitud_Verificacion = ? LIMIT 1`,
      [Number(ruta)]
    );
    if (!rows[0]) return json({ mensaje: 'Solicitud no encontrada.' }, 404);
    return json({ ...rows[0], Ubicacion_Usuario: null, aceptacionesLegales: [] });
  }

  // Listado: /api/admin/verificaciones?estado=&rol=&busqueda=
  const estado = url.searchParams.get('estado') ?? '';
  const rol = Number(url.searchParams.get('rol') ?? 0);
  const busqueda = (url.searchParams.get('busqueda') ?? '').trim();

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (estado && estado !== 'todos' && ESTADOS.includes(estado)) { where.push('v.Estado = ?'); args.push(estado); }
  if (rol === 2 || rol === 3) { where.push('u.Id_Rol = ?'); args.push(rol); }
  if (busqueda) { where.push('(u.Nombre LIKE ? OR u.Correo LIKE ?)'); args.push(`%${busqueda}%`, `%${busqueda}%`); }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.Id_Solicitud_Verificacion, v.Id_Usuario, v.Tipo_Documento, v.Numero_Documento,
            v.Estado, v.Fecha_Creacion, u.Nombre AS Nombre_Usuario, u.Correo AS Correo_Usuario, u.Id_Rol
       FROM solicitudes_verificacion v
       JOIN usuarios u ON u.Id_Usuario = v.Id_Usuario
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY v.Id_Solicitud_Verificacion DESC`,
    args
  );

  // El número completo nunca sale en el listado
  return json(rows.map(({ Numero_Documento, ...resto }) => ({
    ...resto,
    Numero_Documento_Enmascarado: enmascarar(String(Numero_Documento ?? '')),
  })));
};

/* ---------- PUT: decisiones ---------- */
const ACCIONES: Record<string, { estado: string; campo: string; msg: string; exigeTexto: boolean }> = {
  'aprobar':       { estado: 'aprobado',             campo: 'Notas_Admin',           msg: 'Verificación aprobada correctamente.', exigeTexto: false },
  'en-revision':   { estado: 'en_revision',          campo: 'Notas_Admin',           msg: 'La solicitud quedó en revisión.',      exigeTexto: false },
  'solicitar-info':{ estado: 'requiere_informacion', campo: 'Informacion_Requerida', msg: 'Se solicitó información adicional.',   exigeTexto: true },
  'rechazar':      { estado: 'rechazado',            campo: 'Motivo_Rechazo',        msg: 'La solicitud fue rechazada.',          exigeTexto: true },
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const admin = await esAdmin(cookies);
  if (!admin) return json({ mensaje: 'No autorizado.' }, 403);

  const [id, accion] = String(params.ruta ?? '').split('/');
  const def = ACCIONES[accion];
  if (!/^\d+$/.test(id) || !def) return json({ mensaje: 'Ruta no válida.' }, 404);

  const body = await request.json().catch(() => ({}));
  const texto = String(body.notas ?? body.infoRequerida ?? body.motivo ?? '').trim().slice(0, 2000);
  if (def.exigeTexto && !texto) return json({ mensaje: 'Debes escribir la observación.' }, 400);

  // La decisión y el estado de la cuenta deben cambiar juntos. Si solo se
  // actualiza la solicitud, el panel la muestra aprobada pero el usuario queda
  // bloqueado como pendiente en el resto de la plataforma.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [solicitudes] = await conn.query<RowDataPacket[]>(
      'SELECT Id_Usuario FROM solicitudes_verificacion WHERE Id_Solicitud_Verificacion = ? FOR UPDATE',
      [Number(id)]
    );
    const solicitud = solicitudes[0];
    if (!solicitud) {
      await conn.rollback();
      return json({ mensaje: 'Solicitud no encontrada.' }, 404);
    }

    const [r] = await conn.query<ResultSetHeader>(
      `UPDATE solicitudes_verificacion
          SET Estado = ?, ${def.campo} = ?, Revisado_Por = ?, Fecha_Revision = NOW()
        WHERE Id_Solicitud_Verificacion = ?`,
      [def.estado, texto || null, admin, Number(id)]
    );
    if (r.affectedRows === 0) {
      await conn.rollback();
      return json({ mensaje: 'Solicitud no encontrada.' }, 404);
    }

    await conn.query(
      `UPDATE usuarios SET Verificado = ?, Estado_Verificacion = ? WHERE Id_Usuario = ?`,
      [def.estado === 'aprobado' ? 1 : 0, def.estado, solicitud.Id_Usuario]
    );
    await conn.commit();
    return json({ ok: true, mensaje: def.msg });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('No se pudo guardar la decisión de verificación:', error);
    return json({ mensaje: 'No se pudo guardar la decisión. Intenta de nuevo.' }, 500);
  } finally {
    conn.release();
  }
};
