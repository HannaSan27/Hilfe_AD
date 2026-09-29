import { Context } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { ImagenTrabajo } from "../Models/imagenesTrabajosModel.ts";

export const getImagenesTrabajos = async (ctx: Context) => {
  try {
    const url = ctx.request.url;
    const servicio = url.searchParams.get("servicio");

    let sql = "SELECT * FROM imagenes_trabajos WHERE 1 = 1";
    const params: unknown[] = [];

    if (servicio) {
      sql += " AND Id_Servicio = ?";
      params.push(servicio);
    }

    const result = await client.query(sql, params);
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener las imagenes", error: String(error) };
  }
};

export const getImagenTrabajoPorId = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      "SELECT * FROM imagenes_trabajos WHERE Id_Imagen = ?",
      [id]
    );
    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Imagen no encontrada" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = result[0];
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la imagen", error: String(error) };
  }
};

export const crearImagenTrabajo = async (ctx: Context) => {
  try {
    const body: Partial<ImagenTrabajo> = await ctx.request.body.json();
    const { Id_Servicio, Ruta_Imagen } = body;

    if (!Id_Servicio || !Ruta_Imagen) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Id_Servicio y Ruta_Imagen son obligatorios" };
      return;
    }

    await client.execute(
      "INSERT INTO imagenes_trabajos (Id_Servicio, Ruta_Imagen) VALUES (?, ?)",
      [Id_Servicio, Ruta_Imagen]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Imagen registrada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al registrar la imagen", error: String(error) };
  }
};

export const eliminarImagenTrabajo = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    await client.execute("DELETE FROM imagenes_trabajos WHERE Id_Imagen = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Imagen eliminada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar la imagen", error: String(error) };
  }
};