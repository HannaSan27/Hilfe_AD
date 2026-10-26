import type { APIRoute } from 'astro';
export const prerender = false;

export const POST: APIRoute = ({ cookies }) => {
  cookies.delete('usuario_id', { path: '/' });
  cookies.delete('backend_token', { path: '/' });
  return Response.json({ ok: true });
};
