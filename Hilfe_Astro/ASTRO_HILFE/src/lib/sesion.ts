import type { AstroCookies } from 'astro';

export function getUsuarioId(cookies: AstroCookies): number | null {
  const v = cookies.get('usuario_id')?.value;
  const id = v ? Number(v) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
  
}
