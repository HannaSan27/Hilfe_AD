import nodemailer from 'nodemailer';

const host = import.meta.env.SMTP_HOST;
const port = Number(import.meta.env.SMTP_PORT ?? 465);

const transporter = host
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: import.meta.env.SMTP_USER, pass: import.meta.env.SMTP_PASS },
    })
  : null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function enviarCodigo(para: string, nombre: string, codigo: string, accion: string, monto: number) {
  if (!transporter) {
    if (import.meta.env.DEV) { console.log(`[DEV] Código para ${para}: ${codigo}`); return; }
    throw new Error('CORREO_ERROR');
  }
  const verbo = accion === 'retirar' ? 'un retiro' : 'una recarga';
  const valor = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monto);
  try {
    await transporter.sendMail({
      from: import.meta.env.SMTP_FROM ?? import.meta.env.SMTP_USER,
      to: para,
      subject: `Tu código de verificación Hilf'e: ${codigo}`,
      text: `Hola ${nombre}, tu código para confirmar ${verbo} de ${valor} es ${codigo}. Vence en 10 minutos. Si no fuiste tú, ignora este mensaje.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
        <h2 style="margin:0 0 8px">Hilf<span style="color:#2563eb">'e</span></h2>
        <p>Hola ${esc(nombre)}, usa este código para confirmar ${verbo} de <b>${valor}</b>:</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:16px 0;color:#1d4ed8">${codigo}</p>
        <p style="color:#64748b;font-size:13px">Vence en 10 minutos. Si no fuiste tú, ignora este mensaje y no compartas el código.</p>
      </div>`,
    });
  } catch (e) {
    console.error('Error enviando correo:', e);
    throw new Error('CORREO_ERROR');
  }
}