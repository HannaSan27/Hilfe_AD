import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import {
  buscarUsuarioPorId,
  actualizarUsuario,
  actualizarUsuarioConLimiteNombre,
  consultarCambiosNombreRestantes,
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
  const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
  if (Number(sesion?.id) !== id && Number(sesion?.rol) !== 1) {
    ctx.response.status = 403;
    ctx.response.body = { mensaje: "Solo puedes editar tu propio perfil" };
    return;
  }
  const body = await ctx.request.body.json();
  const nombre = String(body.nombre || "").trim().replace(/\s+/g, " ");
  const telefono = body.telefono;
  const ubicacion = body.ubicacion;

  if (!nombre) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El nombre es obligatorio" };
    return;
  }

  const usuarioActual = await buscarUsuarioPorId(id);
  if (!usuarioActual) {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "Usuario no encontrado" };
    return;
  }

  const nombreActual = String(usuarioActual.Nombre || "").trim().replace(/\s+/g, " ");
  if (nombre !== nombreActual) {
    const resultado = await actualizarUsuarioConLimiteNombre(id, nombre, telefono, ubicacion);
    if (Number(resultado.affectedRows || 0) === 0) {
      const usuarioRevisado = await buscarUsuarioPorId(id);
      const nombreRevisado = String(usuarioRevisado?.Nombre || "").trim().replace(/\s+/g, " ");
      if (nombre !== nombreRevisado) {
        ctx.response.status = 429;
        ctx.response.body = {
          mensaje: "Alcanzaste el límite de 3 cambios de nombre completo este mes.",
          cambiosNombreRestantes: 0,
        };
        return;
      }
      await actualizarUsuario(id, nombre, telefono, ubicacion);
    }
  } else {
    await actualizarUsuario(id, nombre, telefono, ubicacion);
  }

  const cambiosNombreRestantes = await consultarCambiosNombreRestantes(id);

  ctx.response.status = 200;
  ctx.response.body = { mensaje: "Perfil actualizado correctamente", cambiosNombreRestantes };
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

  if (foto.size <= 0 || foto.size > 5 * 1024 * 1024) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "La foto debe pesar entre 1 byte y 5 MB" };
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

  const bytes = new Uint8Array(await foto.arrayBuffer());
  const esJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const esPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if ((extension === "jpg" && !esJpeg) || (extension === "png" && !esPng)) {
    ctx.response.status = 400;
    ctx.response.body = { mensaje: "El contenido del archivo no coincide con una imagen JPG o PNG válida" };
    return;
  }

  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const rutaArchivo = new URL(nombreArchivo, directorioFotosPerfil);
  let archivoGuardado = false;

  try {
    await Deno.mkdir(directorioFotosPerfil, { recursive: true });
    await Deno.writeFile(rutaArchivo, bytes, { createNew: true });
    archivoGuardado = true;
    await actualizarFotoPerfil(id, nombreArchivo);

    ctx.response.status = 200;
    ctx.response.body = {
      mensaje: "Foto de perfil actualizada correctamente",
      fotoPerfil: nombreArchivo,
      url: `/api/usuarios/${id}/foto-perfil`,
    };
  } catch (error) {
    if (archivoGuardado) await Deno.remove(rutaArchivo).catch(() => {});
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
