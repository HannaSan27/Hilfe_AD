import { create, verify } from "./../Dependencies/dependencies.ts";

// Convierte el texto del .env en una llave criptográfica fija
const textoLlave = Deno.env.get("JWT_SECRET") || "llave-temporal-cambiar";
const bytesLlave = new TextEncoder().encode(textoLlave);

export const llaveSecreta = await crypto.subtle.importKey(
  "raw",
  bytesLlave,
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export async function generarToken(idUsuario: number, idRol: number) {
  return await create(
    { alg: "HS512", typ: "JWT" },
    { id: idUsuario, rol: idRol },
    llaveSecreta
  );
}

export async function verificarToken(token: string) {
  return await verify(token, llaveSecreta);
}