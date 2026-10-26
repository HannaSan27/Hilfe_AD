import type { APIRoute } from 'astro';

export const prerender = false;

const DESTINOS: Record<number, string> = {
  1: '/',
  2: '/',
  3: '/',
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const { correo, contrasena, recordar } = await request.json().catch(() => ({}));

  if (!correo || !contrasena) {
    return Response.json({ ok: false, mensaje: 'Completa correo y contraseña.' }, { status: 400 });
  }

  const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: String(correo).trim().toLowerCase(), contrasena }),
    });
  } catch {
    return Response.json({ ok: false, mensaje: "No se pudo conectar con el servidor de autenticación." }, { status: 503 });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token || !data.usuario) {
    return Response.json({ ok: false, ...data }, { status: response.status || 502 });
  }
  const destino = DESTINOS[Number(data.usuario.rol)];
  if (!destino) return Response.json({ ok: false, mensaje: 'La cuenta no tiene un rol válido. Contacta al administrador.' }, { status: 403 });

  cookies.set('usuario_id', String(data.usuario.id), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: recordar ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
  });

  return Response.json({
    ok: true,
    token: data.token,
    destino,
    usuario: data.usuario,
  });
};
