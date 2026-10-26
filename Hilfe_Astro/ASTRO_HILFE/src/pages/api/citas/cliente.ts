import type { APIRoute } from 'astro';
import { GET as obtenerCitas } from './citas';

export const prerender = false;
export const GET: APIRoute = obtenerCitas;
