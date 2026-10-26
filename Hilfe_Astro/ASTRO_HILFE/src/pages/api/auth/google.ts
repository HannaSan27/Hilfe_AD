import type { APIRoute } from 'astro';

export const prerender = false;

const DESTINOS: Record<number, string> = {
  1: '/',
  2: '/',
  3: '/',
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  if (typeof body.credential !== 'string' || !body.credential) {
    return Response.json({ mensaje: 'Falta la credencial de Google.' }, { status: 400 });
  }

  const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: body.credential }),
    });
  } catch {
    return Response.json({ mensaje: 'No se pudo conectar con el servidor de autenticación.' }, { status: 503 });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return Response.json(data, { status: upstream.status });

  // Una cuenta nueva debe completar primero el formulario de registro. No crear sesión
  // hasta que Deno confirme que la cuenta ya existe y tenga un rol utilizable.
  if (data.existe && data.usuario && data.token) {
    const role = Number(data.usuario.rol);
    if (!DESTINOS[role] || !Number(data.usuario.id)) {
      return Response.json({ mensaje: 'La cuenta no tiene un rol válido. Contacta al administrador.' }, { status: 403 });
    }
    cookies.set('usuario_id', String(data.usuario.id), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 8,
    });
    data.destino = DESTINOS[role];
  }

  return Response.json(data, { status: upstream.status });
};
