import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import {
  buscarUsuarioPorId,
  actualizarUsuario,
  actualizarFotoPerfil,
} from "./../Models/usuariosModel.ts";

const directorioFotosPerfil = new URL("../uploads/perfiles/", import.meta.url);

// GET /api/usuarios/:id
export async function obtenerPerfil(ctx: RouterContext<string>) {
  const id = Number(ctx.params.id);
  const usuario = await buscarUsuarioPorId(id);

  if (!usuario) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Usuario no encontrado" };
    return;
  }

  ctx.response.status = 200;
  ctx.response.body = usuario;
}

// PUT /api/usuarios/:id
export async function editarPerfil(ctx: RouterContext<string>) {
  const id = Number(ctx.params.id);
  const body = await ctx.request.body.json();
  const { nombre, telefono, ubicacion } = body;

  if (!nombre) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El nombre es obligatorio" };
    return;
  }

  await actualizarUsuario(id, nombre, telefono, ubicacion);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Perfil actualizado correctamente" };
}

// POST /api/usuarios/:id/foto-perfil
export async function subirFotoPerfil(ctx: RouterContext<string>) {
  const id = Number(ctx.params.id);
  const usuarioSesion = ctx.state.usuario as { id?: number } | undefined;

  if (!Number.isInteger(id) || id <= 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El id de usuario no es válido" };
    return;
  }

  if (Number(usuarioSesion?.id) !== id) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Solo puedes actualizar tu propia foto de perfil" };
    return;
  }

  const formData = await ctx.request.body.formData();
  const foto = formData.get("foto_Perfil");

  if (!(foto instanceof File)) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "Debes seleccionar una foto de perfil" };
    return;
  }

  const extensiones: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const extension = extensiones[foto.type];

  if (!extension) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "La foto debe ser JPG o PNG" };
    return;
  }

  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const rutaArchivo = new URL(nombreArchivo, directorioFotosPerfil);

  try {
    await Deno.mkdir(directorioFotosPerfil, { recursive: true });
    await Deno.writeFile(rutaArchivo, new Uint8Array(await foto.arrayBuffer()));
    await actualizarFotoPerfil(id, nombreArchivo);

    ctx.response.status = 200;
    ctx.response.body = {
      mensaje: "Foto de perfil actualizada correctamente",
      fotoPerfil: nombreArchivo,
      url: `/api/usuarios/${id}/foto-perfil`,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "No fue posible guardar la foto de perfil", error: String(error) };
  }
}

// GET /api/usuarios/:id/foto-perfil
export async function obtenerFotoPerfil(ctx: RouterContext<string>) {
  const id = Number(ctx.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El id de usuario no es válido" };
    return;
  }

  const usuario = await buscarUsuarioPorId(id);
  const nombreArchivo = usuario?.Foto_Perfil;

  if (typeof nombreArchivo !== "string" || !/^[0-9a-f-]{36}\.(jpg|png)$/i.test(nombreArchivo)) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "El usuario no tiene una foto de perfil" };
    return;
  }

  try {
    const rutaArchivo = new URL(nombreArchivo, directorioFotosPerfil);
    ctx.response.headers.set("Content-Type", nombreArchivo.endsWith(".png") ? "image/png" : "image/jpeg");
    ctx.response.headers.set("Cache-Control", "public, max-age=3600");
    ctx.response.body = await Deno.readFile(rutaArchivo);
  } catch {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "No se encontró el archivo de foto de perfil" };
  }
}
