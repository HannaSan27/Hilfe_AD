import type { APIRoute } from 'astro';
import { getUsuarioId } from '../../../lib/sesion';
import {
  solicitarCodigo,
  recargar,
  retirar,
  pagarSolicitud,
  cancelarSolicitud,
} from '../../../lib/billetera';

export const prerender = false;

const STATUS: Record<string, number> = {
  NO_SESION: 401,
  NO_AUTORIZADO: 403,
  NO_EXISTE: 404,
  YA_PAGADA: 409,
  YA_CANCELADA: 409,
  NO_PAGABLE: 409,
  MONTO_INVALIDO: 400,
  SALDO_INSUFICIENTE: 400,
  BANCO_INVALIDO: 400,
  CODIGO_INVALIDO: 400,
  CODIGO_EXPIRADO: 400,
  NO_CANCELABLE: 409,
  DEMASIADOS_INTENTOS: 429,
  ESPERA: 429,
  CORREO_ERROR: 502,
  RUTA_INVALIDA: 400,
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const uid = getUsuarioId(cookies);
  if (!uid) return Response.json({ ok: false, error: 'NO_SESION' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  try {
    let res: object;

    switch (params.accion) {
      case 'codigo':
        res = await solicitarCodigo(
          uid,
          String(body.accion),
          Number(body.monto),
          String(body.banco ?? '')
        );
        break;

      case 'recargar':
        res = await recargar(
          uid,
          Number(body.monto),
          String(body.banco ?? ''),
          body.codigo
        );
        break;

      case 'retirar':
        res = await retirar(
          uid,
          Number(body.monto),
          String(body.banco ?? ''),
          body.ultimos,
          body.codigo
        );
        break;

      case 'pagar':
        res = await pagarSolicitud(Number(body.solicitudId), uid);
        break;

      case 'cancelar':
        res = await cancelarSolicitud(Number(body.solicitudId), uid);
        break;

      default:
        return Response.json({ ok: false, error: 'RUTA_INVALIDA' }, { status: 404 });
    }

    return Response.json({ ok: true, ...res, redirect: '/billetera' });
  } catch (e: any) {
    console.error(e);
    return Response.json(
      { ok: false, error: e.message },
      { status: STATUS[e.message] ?? 500 }
    );
  }
};