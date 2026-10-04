import { Context, RouterContext } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { ImagenTrabajo } from "../Models/imagenesTrabajosModel.ts";

const directorioImagenes = new URL("../uploads/trabajos/", import.meta.url);
const tiposImagen = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function esNombreImagenSeguro(nombre: unknown): nombre is string {
  return typeof nombre === "string" && /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(nombre);
}

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

export const getImagenTrabajoPorId = async (ctx: RouterContext<string>) => {
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

export const getArchivoImagenTrabajo = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      "SELECT Ruta_Imagen FROM imagenes_trabajos WHERE Id_Imagen = ?",
      [id]
    );
    const nombreArchivo = result[0]?.Ruta_Imagen;
    if (!esNombreImagenSeguro(nombreArchivo)) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Imagen no encontrada" };
      return;
    }

    const extension = nombreArchivo.split(".").pop();
    ctx.response.headers.set("Content-Type", `image/${extension === "jpg" ? "jpeg" : extension}`);
    ctx.response.headers.set("Cache-Control", "public, max-age=3600");
    ctx.response.body = await Deno.readFile(new URL(nombreArchivo, directorioImagenes));
  } catch {
    ctx.response.status = 404;
    ctx.response.body = { mensaje: "No se encontró el archivo de imagen" };
  }
};

export const crearImagenTrabajo = async (ctx: Context) => {
  let nombreArchivo: string | undefined;
  try {
    const contentType = ctx.request.headers.get("content-type") || "";
    let Id_Servicio: number;
    let Ruta_Imagen: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await ctx.request.body.formData();
      const idServicio = Number(formData.get("Id_Servicio"));
      const archivo = formData.get("foto");
      if (!Number.isInteger(idServicio) || idServicio <= 0 || !(archivo instanceof File)) {
        ctx.response.status = 400;
        ctx.response.body = { mensaje: "Id_Servicio y una foto son obligatorios" };
        return;
      }

      const extension = tiposImagen.get(archivo.type);
      if (!extension) {
        ctx.response.status = 400;
        ctx.response.body = { mensaje: "La foto debe ser JPG, PNG o WEBP" };
        return;
      }
      if (archivo.size <= 0 || archivo.size > 8 * 1024 * 1024) {
        ctx.response.status = 400;
        ctx.response.body = { mensaje: "La foto debe pesar como máximo 8 MB" };
        return;
      }

      const servicio = await client.query(
        "SELECT Id_Servicio FROM servicios WHERE Id_Servicio = ?",
        [idServicio]
      );
      if (servicio.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { mensaje: "Servicio no encontrado" };
        return;
      }

      nombreArchivo = `${crypto.randomUUID()}.${extension}`;
      await Deno.mkdir(directorioImagenes, { recursive: true });
      await Deno.writeFile(
        new URL(nombreArchivo, directorioImagenes),
        new Uint8Array(await archivo.arrayBuffer())
      );
      Id_Servicio = idServicio;
      Ruta_Imagen = nombreArchivo;
    } else {
      const body: Partial<ImagenTrabajo> = await ctx.request.body.json();
      Id_Servicio = Number(body.Id_Servicio);
      Ruta_Imagen = String(body.Ruta_Imagen || "");
    }

    if (!Id_Servicio || !Ruta_Imagen) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Id_Servicio y Ruta_Imagen son obligatorios" };
      return;
    }

    await client.execute(
      "INSERT INTO imagenes_trabajos (Id_Servicio, Ruta_Imagen) VALUES (?, ?)",
      [Id_Servicio, Ruta_Imagen]
    );

    const creada = await client.query(
      "SELECT Id_Imagen FROM imagenes_trabajos WHERE Id_Servicio = ? AND Ruta_Imagen = ?",
      [Id_Servicio, Ruta_Imagen]
    );

    ctx.response.status = 201;
    ctx.response.body = {
      mensaje: "Imagen registrada correctamente",
      Id_Imagen: creada[0]?.Id_Imagen,
      Ruta_Imagen,
      url: creada[0]?.Id_Imagen
        ? `/api/imagenes-trabajos/${creada[0].Id_Imagen}/archivo`
        : null,
    };
  } catch (error) {
    if (nombreArchivo) {
      await Deno.remove(new URL(nombreArchivo, directorioImagenes)).catch(() => {});
    }
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al registrar la imagen", error: String(error) };
  }
};

export const eliminarImagenTrabajo = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      "SELECT Ruta_Imagen FROM imagenes_trabajos WHERE Id_Imagen = ?",
      [id]
    );
    await client.execute("DELETE FROM imagenes_trabajos WHERE Id_Imagen = ?", [id]);
    const nombreArchivo = result[0]?.Ruta_Imagen;
    if (esNombreImagenSeguro(nombreArchivo)) {
      await Deno.remove(new URL(nombreArchivo, directorioImagenes)).catch(() => {});
    }
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Imagen eliminada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar la imagen", error: String(error) };
  }
};
