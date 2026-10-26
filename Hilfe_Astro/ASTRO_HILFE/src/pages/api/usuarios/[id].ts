import type { APIRoute } from 'astro';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const id = Number(params.id);
  const tokenCookie = cookies.get('backend_token')?.value;
  const tokenHeader = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const tokens = [...new Set([tokenHeader, tokenCookie].filter((value): value is string => Boolean(value)))];
  if (!Number.isInteger(id) || id <= 0 || !tokens.length) {
    return Response.json({ mensaje: 'La sesión venció. Inicia sesión de nuevo.' }, { status: 401 });
  }

  const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
  try {
    const bodySolicitud = await request.text();
    let upstream: Response | null = null;
    for (const token of tokens) {
      upstream = await fetch(`${apiBase}/usuarios/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: bodySolicitud,
      });
      if (upstream.status !== 401) break;
    }
    if (!upstream) throw new Error('No se pudo enviar la actualización.');
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ mensaje: 'No se pudo conectar con el servidor. Inténtalo de nuevo.' }, { status: 503 });
  }
};
