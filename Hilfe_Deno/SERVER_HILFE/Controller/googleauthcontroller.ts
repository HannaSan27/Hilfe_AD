import { Context, hash } from "./../Dependencies/dependencies.ts";
import { buscarUsuarioPorCorreo, crearUsuario } from "./../Models/usuariosModel.ts";
import { generarToken } from "./../Helpers/jwtHelper.ts";
import { verificarTokenGoogle, crearTokenRegistroGoogle, leerTokenRegistroGoogle} from "./../Helpers/googlehelpers.ts";

function respuestaSesion(usuario: Record<string, unknown>, token: string) {
  return {
    mensaje: "Login exitoso",
    token,
    usuario: {
      id: usuario.Id_Usuario,
      nombre: usuario.Nombre,
      correo: usuario.Correo,
      rol: usuario.Id_Rol,
    },
  };
}

// POST /api/auth/google
export async function loginGoogle(ctx: Context) {
  let credential: string | undefined;
  try {
    const body = await ctx.request.body.json();
    credential = body.credential;
  } catch {
    // body vacío o inválido
  }

  if (!credential) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Falta el token de Google" };
    return;
  }

  let datosGoogle;
  try {
    datosGoogle = await verificarTokenGoogle(credential);
  } catch (error) {
    console.error("Google: token no válido:", error);
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "No se pudo verificar la cuenta de Google" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(datosGoogle.correo);

  // Cuenta existente: entra directo
  if (usuario) {
    if (usuario.Estado && usuario.Estado !== "Activo") {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Tu cuenta no está activa" };
      return;
    }

    const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);
    ctx.response.status = 200;
    ctx.response.body = { existe: true, ...respuestaSesion(usuario, token) };
    return;
  }

  // Cuenta nueva: devolver token temporal para elegir rol
  ctx.response.status = 200;
  ctx.response.body = {
    existe: false,
    registroToken: await crearTokenRegistroGoogle(datosGoogle),
    correo: datosGoogle.correo,
    nombre: datosGoogle.nombre,
  };
}

// POST /api/auth/google/completar
export async function completarGoogle(ctx: Context) {
  let registroToken: string | undefined;
  let rol: number | undefined;
  try {
    const body = await ctx.request.body.json();
    registroToken = body.registroToken;
    rol = Number(body.rol);
  } catch {
    // body vacío o inválido
  }

  // Solo trabajador (2) o cliente (3). Nunca admin.
  if (!registroToken || (rol !== 2 && rol !== 3)) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Datos o rol no válidos" };
    return;
  }

  let datosGoogle;
  try {
    datosGoogle = await leerTokenRegistroGoogle(registroToken);
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "La sesión de Google expiró, intenta de nuevo" };
    return;
  }

  if (await buscarUsuarioPorCorreo(datosGoogle.correo)) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "Esta cuenta ya está registrada" };
    return;
  }

  // Contraseña aleatoria con hash: la columna queda llena y nadie puede
  // entrar con contraseña a esta cuenta (solo con Google o recuperándola).
  const contrasenaAleatoria = await hash(crypto.randomUUID() + crypto.randomUUID());

  await crearUsuario(rol, datosGoogle.nombre, datosGoogle.correo, contrasenaAleatoria, "", "");

  const usuario = await buscarUsuarioPorCorreo(datosGoogle.correo);
  const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);

  ctx.response.status = 201;
  ctx.response.body = respuestaSesion(usuario, token);
}