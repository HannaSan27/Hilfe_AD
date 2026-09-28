import { Context, RouterContext } from "./../Dependencies/dependencies.ts";
import { buscarUsuarioPorId, actualizarUsuario } from "./../Models/usuariosModel.ts";

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