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