import {
  create,
  verify,
  createRemoteJWKSet,
  jwtVerify,
} from "./../Dependencies/dependencies.ts";

export interface UsuarioGoogle {
  googleId: string;
  correo: string;
  nombre: string;
}

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

// Llave propia para el token temporal de registro (distinta a la de sesión),
// así este token nunca sirve como token de sesión en tu authMiddleware.
const llaveRegistroGoogle = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(
    (Deno.env.get("JWT_SECRET") || "llave-temporal-cambiar") + ":registro-google",
  ),
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

// Verifica con las llaves públicas de Google que el token es auténtico,
// que es de TU app, que no expiró y que el correo está verificado por Google.
export async function verificarTokenGoogle(idToken: string): Promise<UsuarioGoogle> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("Falta GOOGLE_CLIENT_ID en el .env");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  if (payload.email_verified !== true) {
    throw new Error("El correo de Google no está verificado");
  }
  if (!payload.email || !payload.sub) {
    throw new Error("Token de Google incompleto");
  }

  return {
    googleId: String(payload.sub),
    correo: String(payload.email).toLowerCase(),
    nombre: String(payload.name || payload.email),
  };
}

// Token temporal (10 min) para completar el registro tras elegir rol
export async function crearTokenRegistroGoogle(g: UsuarioGoogle) {
  return await create(
    { alg: "HS512", typ: "JWT" },
    {
      tipo: "registro-google",
      googleId: g.googleId,
      correo: g.correo,
      nombre: g.nombre,
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    llaveRegistroGoogle,
  );
}

export async function leerTokenRegistroGoogle(token: string): Promise<UsuarioGoogle> {
  const payload = await verify(token, llaveRegistroGoogle);
  if (payload.tipo !== "registro-google") throw new Error("Token inválido");
  return {
    googleId: String(payload.googleId),
    correo: String(payload.correo),
    nombre: String(payload.nombre),
  };
}