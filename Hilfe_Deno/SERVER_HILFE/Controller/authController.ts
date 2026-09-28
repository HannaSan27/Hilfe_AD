import { Context, hash, verificarContrasena } from "./../Dependencies/dependencies.ts";
import { buscarUsuarioPorCorreo,crearUsuario,actualizarContrasena,} from "./../Models/usuariosModel.ts";
import { generarToken } from "./../Helpers/jwtHelper.ts";
import { enviarCodigoRecuperacion } from "./../Helpers/correoHelper.ts";
import {guardarCodigo,verificarCodigoGuardado,borrarCodigo,} from "./../Helpers/codigosRecuperacion.ts";

// POST /api/auth/registro
export async function registrar(ctx: Context) {
  const body = await ctx.request.body.json();
  const { idRol, nombre, correo, contrasena, telefono, ubicacion } = body;

  if (!nombre || !correo || !contrasena) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Nombre, correo y contraseña son obligatorios" };
    return;
  }

  const usuarioExistente = await buscarUsuarioPorCorreo(correo);
  if (usuarioExistente) {
    ctx.response.status = 409;
    ctx.response.body = { mensaje: "Ese correo ya está registrado" };
    return;
  }

  const contrasenaEncriptada = await hash(contrasena);

  await crearUsuario(idRol, nombre, correo, contrasenaEncriptada, telefono, ubicacion);

  ctx.response.status = 201;
  ctx.response.body = { mensaje: "Usuario registrado correctamente" };
}

// POST /api/auth/login
export async function login(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo, contrasena } = body;

  if (!correo || !contrasena) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo y contraseña son obligatorios" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Correo o contraseña incorrectos" };
    return;
  }

  const contrasenaValida = await verificarContrasena(contrasena, usuario.Contrasena);
  if (!contrasenaValida) {
    ctx.response.status = 401;
    ctx.response.body = { mensaje: "Correo o contraseña incorrectos" };
    return;
  }

  const token = await generarToken(usuario.Id_Usuario, usuario.Id_Rol);

  ctx.response.status = 200;
  ctx.response.body = {
    mensaje: "Login exitoso",
    token: token,
    usuario: {
      id: usuario.Id_Usuario,
      nombre: usuario.Nombre,
      correo: usuario.Correo,
      rol: usuario.Id_Rol,
    },
  };
}

// POST /api/auth/recuperar/solicitar
export async function solicitarRecuperacion(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo } = body;

  if (!correo) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El correo es obligatorio" };
    return;
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    // No decimos "el correo no existe" por seguridad (para no revelar qué correos están registrados)
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Si el correo existe, se envió un código" };
    return;
  }

  const codigo = guardarCodigo(correo);
  await enviarCodigoRecuperacion(correo, codigo);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Si el correo existe, se envió un código" };
}

// POST /api/auth/recuperar/verificar
export async function verificarCodigo(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo, codigo } = body;

  if (!correo || !codigo) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo y código son obligatorios" };
    return;
  }

  const esValido = verificarCodigoGuardado(correo, codigo);
  if (!esValido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Código inválido o vencido" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Código válido" };
}

// POST /api/auth/recuperar/nueva-contrasena
export async function restablecerContrasena(ctx: Context) {
  const body = await ctx.request.body.json();
  const { correo, codigo, nuevaContrasena } = body;

  if (!correo || !codigo || !nuevaContrasena) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Correo, código y nueva contraseña son obligatorios" };
    return;
  }

  const esValido = verificarCodigoGuardado(correo, codigo);
  if (!esValido) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Código inválido o vencido" };
    return;
  }

  const contrasenaEncriptada = await hash(nuevaContrasena);
  await actualizarContrasena(correo, contrasenaEncriptada);
  borrarCodigo(correo);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Contraseña actualizada correctamente" };
}