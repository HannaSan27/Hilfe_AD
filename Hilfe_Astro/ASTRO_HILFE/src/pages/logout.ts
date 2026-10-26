import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete('usuario_id', { path: '/' });
  cookies.delete('backend_token', { path: '/' });
  return redirect('/', 303);
};
