import { Context, RouterContext } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { Categoria } from "../Models/categoriasModel.ts";

export const getCategorias = async (ctx: Context) => {
  try {
    const result = await client.query("SELECT * FROM categorias");
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener las categorias", error: String(error) };
  }
};

export const getCategoriaPorId = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      "SELECT * FROM categorias WHERE Id_Categoria = ?",
      [id]
    );
    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Categoria no encontrada" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = result[0];
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la categoria", error: String(error) };
  }
};

export const crearCategoria = async (ctx: Context) => {
  try {
    const body: Partial<Categoria> = await ctx.request.body.json();
    const { Nombre_Categoria, Descripcion } = body;

    if (!Nombre_Categoria) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Nombre_Categoria es obligatorio" };
      return;
    }

    const resultadoId = await client.query(
      "SELECT COALESCE(MAX(Id_Categoria), 0) + 1 AS Id_Siguiente FROM categorias"
    );
    const Id_Categoria = Number(resultadoId[0]?.Id_Siguiente);
    if (!Number.isInteger(Id_Categoria) || Id_Categoria <= 0) {
      throw new Error("No fue posible asignar un identificador a la categoría");
    }

    await client.execute(
      "INSERT INTO categorias (Id_Categoria, Nombre_Categoria, Descripcion) VALUES (?, ?, ?)",
      [Id_Categoria, Nombre_Categoria, Descripcion ?? null]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Categoria creada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear la categoria", error: String(error) };
  }
};

export const actualizarCategoria = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const body: Partial<Categoria> = await ctx.request.body.json();
    const { Nombre_Categoria, Descripcion } = body;

    await client.execute(
      "UPDATE categorias SET Nombre_Categoria = ?, Descripcion = ? WHERE Id_Categoria = ?",
      [Nombre_Categoria, Descripcion ?? null, id]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Categoria actualizada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al actualizar la categoria", error: String(error) };
  }
};

export const eliminarCategoria = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    await client.execute("DELETE FROM categorias WHERE Id_Categoria = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Categoria eliminada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar la categoria", error: String(error) };
  }
};
