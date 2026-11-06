import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  let astroDatabase: 'ok' | 'unavailable' = 'unavailable';
  let denoApi: 'ok' | 'unavailable' = 'unavailable';

  try {
    await pool.query('SELECT 1');
    astroDatabase = 'ok';
  } catch (error) {
    console.error('Health check de MySQL en Astro falló:', error);
  }

  const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
  try {
    const response = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      if (body.ok && body.database === 'ok') denoApi = 'ok';
    }
  } catch (error) {
    console.error('Health check de Deno desde Astro falló:', error);
  }

  const ok = astroDatabase === 'ok' && denoApi === 'ok';
  return Response.json(
    { ok, astroDatabase, denoApi, expectedApi: apiBase },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
};
