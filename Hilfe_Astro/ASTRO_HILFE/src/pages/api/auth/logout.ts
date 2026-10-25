import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = ({ cookies }) => {
  cookies.delete('usuario_id', { path: '/' });
  return Response.json({ ok: true });
};