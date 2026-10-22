import { SMTPClient } from "./../Dependencies/dependencies.ts";

export async function enviarCodigoRecuperacion(correoDestino: string, codigo: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: Deno.env.get("EMAIL_USER") || "",
        password: Deno.env.get("EMAIL_PASS") || "",
      },
    },
  });

  await client.send({
    from: `HILFE Soporte <${Deno.env.get("EMAIL_USER")}>`,
    to: correoDestino,
    subject: "Código para recuperar tu contraseña - HILFE",
    html: `
      <h2>Recuperación de contraseña</h2>
      <p>Tu código de verificación es:</p>
      <h1>${codigo}</h1>
      <p>Este código vence en 15 minutos. Si no pediste este cambio, ignora este correo.</p>
    `,
  });

  await client.close();
}

export async function enviarCodigoRecuperacionBonito(correoDestino: string, codigo: string) {
  const emailUser = Deno.env.get("EMAIL_USER") || "";
  const emailPass = Deno.env.get("EMAIL_PASS") || "";
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: emailUser, password: emailPass },
    },
  });

  try {
    await client.send({
      from: `Hilf'e <${emailUser}>`,
      to: correoDestino,
      subject: "Tu codigo de seguridad Hilf'e",
      html: `
        <div style="margin:0;padding:32px 16px;background:#f3f6fc;font-family:Arial,Helvetica,sans-serif;color:#13213d;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 14px 36px rgba(27,55,110,.13);">
            <tr><td style="padding:30px 36px;background:linear-gradient(135deg,#1d4ed8,#5b42d9);color:#ffffff;">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.7px;">Hilf<span style="color:#93c5fd;">'e</span></div>
              <div style="margin-top:26px;font-size:12px;font-weight:700;letter-spacing:1.5px;">RECUPERACION DE ACCESO</div>
              <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#ffffff;">Tu cuenta esta protegida</h1>
            </td></tr>
            <tr><td style="padding:34px 36px 20px;">
              <p style="margin:0 0 12px;font-size:17px;line-height:1.55;color:#1c2942;">Recibimos una solicitud para restablecer tu contrasena.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#58677f;">Ingresa este codigo de seis digitos en Hilf'e para continuar:</p>
              <div style="margin:26px 0 22px;padding:21px 16px;border:1px solid #cfe0ff;border-radius:14px;background:#f4f8ff;text-align:center;">
                <div style="margin-bottom:9px;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#5370aa;">CODIGO DE VERIFICACION</div>
                <div style="font-size:38px;font-weight:800;letter-spacing:9px;line-height:1;color:#1d4ed8;white-space:nowrap;">${escaparHtml(codigo)}</div>
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;background:#fff8e7;border:1px solid #f4dfaa;border-radius:12px;">
                <tr><td style="padding:14px 16px;font-size:14px;line-height:1.5;color:#73551b;"><strong>Por tu seguridad:</strong> este codigo vence en 15 minutos y solo puede usarse una vez.</td></tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#66758d;">Si no solicitaste este cambio, puedes ignorar este mensaje: tu contrasena seguira siendo la misma.</p>
            </td></tr>
            <tr><td style="padding:22px 36px 30px;border-top:1px solid #e9eef7;font-size:12px;line-height:1.55;color:#8793a7;">Este es un correo automatico de Hilf'e. Nunca compartas este codigo con otra persona.</td></tr>
          </table>
        </div>`,
    });
  } finally {
    await client.close();
  }
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>'"]/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[caracter] || caracter));
}

export async function enviarCorreoBienvenidaVerificacionAprobada(
  correoDestino: string,
  nombre: string,
  rol: number,
) {
  const emailUser = Deno.env.get("EMAIL_USER") || "";
  const emailPass = Deno.env.get("EMAIL_PASS") || "";
  if (!emailUser || !emailPass) {
    throw new Error("El correo SMTP no estÃ¡ configurado (EMAIL_USER y EMAIL_PASS).");
  }

  const nombreSeguro = escaparHtml(nombre.trim() || "usuario");
  const esTrabajador = Number(rol) === 2;
  const accionPrincipal = esTrabajador ? "publicar tus servicios y recibir solicitudes" : "agendar servicios con profesionales verificados";
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: emailUser, password: emailPass },
    },
  });

  try {
    await client.send({
      from: `Hilf'e <${emailUser}>`,
      to: correoDestino,
      subject: "Â¡Tu cuenta Hilf'e fue aprobada! Bienvenido/a",
      html: `
        <div style="margin:0;padding:32px 16px;background:#f3f6fc;font-family:Arial,Helvetica,sans-serif;color:#14213d;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(24,45,93,.12);">
            <tr><td style="padding:32px 38px;background:linear-gradient(135deg,#1f56e8,#6944dc);color:#ffffff;">
              <div style="font-size:25px;font-weight:800;letter-spacing:-.6px;">Hilf<span style="color:#8fc2ff;">'e</span></div>
              <div style="margin-top:28px;font-size:13px;font-weight:700;letter-spacing:1.4px;">CUENTA VERIFICADA</div>
              <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;">Â¡Bienvenido/a a Hilf'e!</h1>
            </td></tr>
            <tr><td style="padding:36px 38px 16px;">
              <p style="margin:0 0 16px;font-size:17px;line-height:1.65;">Hola, <strong>${nombreSeguro}</strong>:</p>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#465572;">Tenemos una excelente noticia: revisamos tu solicitud y tu identidad fue aprobada correctamente. Tu cuenta ya estÃ¡ habilitada.</p>
              <div style="margin:26px 0;padding:18px 20px;border-radius:14px;background:#edf8f1;border:1px solid #ccecd8;color:#17633b;">
                <strong style="font-size:16px;">âœ“ VerificaciÃ³n aprobada</strong><br />
                <span style="display:block;margin-top:7px;line-height:1.5;">Ahora puedes ${accionPrincipal}.</span>
              </div>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#465572;">Gracias por hacer parte de nuestra comunidad. Estamos felices de tenerte aquÃ­.</p>
              <a href="http://localhost:4321/login/login" style="display:inline-block;padding:14px 23px;border-radius:10px;background:#245be9;color:#ffffff;text-decoration:none;font-weight:700;">Ir a mi cuenta</a>
            </td></tr>
            <tr><td style="padding:24px 38px 32px;color:#78859c;font-size:12px;line-height:1.55;">Este es un correo automÃ¡tico de Hilf'e. Si no reconoces esta solicitud, por favor contÃ¡ctanos.</td></tr>
          </table>
        </div>`,
    });
  } finally {
    await client.close();
  }
}

// Esta versiÃ³n usa solo ASCII en el cÃ³digo fuente y entidades HTML para evitar
// que el transporte SMTP o el cliente de correo alteren caracteres especiales.
export async function enviarCorreoBienvenidaAprobadaAscii(
  correoDestino: string,
  nombre: string,
  rol: number,
) {
  const emailUser = Deno.env.get("EMAIL_USER") || "";
  const emailPass = Deno.env.get("EMAIL_PASS") || "";
  if (!emailUser || !emailPass) {
    throw new Error("SMTP email is not configured.");
  }

  const nombreSeguro = escaparHtml(nombre.trim() || "usuario");
  const accionPrincipal = Number(rol) === 2
    ? "publicar tus servicios y recibir solicitudes"
    : "agendar servicios con profesionales verificados";
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: emailUser, password: emailPass },
    },
  });

  try {
    await client.send({
      from: `Hilf'e <${emailUser}>`,
      to: correoDestino,
      subject: "Tu cuenta Hilf'e fue aprobada - Bienvenido/a",
      html: `
        <div style="margin:0;padding:32px 16px;background:#f3f6fc;font-family:Arial,Helvetica,sans-serif;color:#14213d;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(24,45,93,.12);">
            <tr><td style="padding:32px 38px;background:linear-gradient(135deg,#1f56e8,#6944dc);color:#fff;">
              <div style="font-size:25px;font-weight:800;letter-spacing:-.6px;">Hilf<span style="color:#8fc2ff;">'e</span></div>
              <div style="margin-top:28px;font-size:13px;font-weight:700;letter-spacing:1.4px;">CUENTA VERIFICADA</div>
              <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;">&iexcl;Bienvenido/a a Hilf'e!</h1>
            </td></tr>
            <tr><td style="padding:36px 38px 16px;">
              <p style="margin:0 0 16px;font-size:17px;line-height:1.65;">Hola, <strong>${nombreSeguro}</strong>:</p>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#465572;">Tenemos una excelente noticia: revisamos tu solicitud y tu identidad fue aprobada correctamente. Tu cuenta ya esta habilitada.</p>
              <div style="margin:26px 0;padding:18px 20px;border-radius:14px;background:#edf8f1;border:1px solid #ccecd8;color:#17633b;">
                <strong style="font-size:16px;">&#10003; Verificacion aprobada</strong><br />
                <span style="display:block;margin-top:7px;line-height:1.5;">Ahora puedes ${accionPrincipal}.</span>
              </div>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#465572;">Gracias por hacer parte de nuestra comunidad. Estamos felices de tenerte aqui.</p>
              <a href="http://localhost:4321/login/login" style="display:inline-block;padding:14px 23px;border-radius:10px;background:#245be9;color:#fff;text-decoration:none;font-weight:700;">Ir a mi cuenta</a>
            </td></tr>
            <tr><td style="padding:24px 38px 32px;color:#78859c;font-size:12px;line-height:1.55;">Este es un correo automatico de Hilf'e. Si no reconoces esta solicitud, por favor contactanos.</td></tr>
          </table>
        </div>`,
    });
  } finally {
    await client.close();
  }
}
