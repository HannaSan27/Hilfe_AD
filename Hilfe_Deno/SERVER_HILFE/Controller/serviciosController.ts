import { Context } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { Servicio } from "../Models/serviciosModel.ts";

export const getServicios = async (ctx: Context) => {
  try {
    const url = ctx.request.url;
    const categoria = url.searchParams.get("categoria");
    const busqueda = url.searchParams.get("busqueda");
    const calificacionMin = url.searchParams.get("calificacionMin");
    const precioMax = url.searchParams.get("precioMax");
    const orden = url.searchParams.get("orden");

    let sql = `
      SELECT
        s.Id_Servicio, s.Titulo, s.Descripcion, s.Precio, s.TipoServicio,
        s.Id_Categoria, c.Nombre_Categoria,
        s.Id_Trabajador, u.Nombre AS Nombre_Trabajador, u.Ubicacion,
        COALESCE(AVG(cal.Puntaje), 0) AS Calificacion_Promedio,
        COUNT(cal.Id_Calificaciones) AS Total_Resenas
      FROM servicios s
      JOIN usuarios u ON s.Id_Trabajador = u.Id_Usuario
      JOIN categorias c ON s.Id_Categoria = c.Id_Categoria
      LEFT JOIN solicitudes sol ON sol.Id_Servicio = s.Id_Servicio AND sol.Estado_Solicitudes = 'finalizado'
      LEFT JOIN calificaciones cal ON cal.Id_Solicitud = sol.Id_Solicitud
      WHERE 1 = 1
    `;
    const params: unknown[] = [];

    if (categoria) {
      sql += " AND s.Id_Categoria = ?";
      params.push(categoria);
    }
    if (busqueda) {
      sql += " AND (s.Titulo LIKE ? OR u.Nombre LIKE ? OR u.Ubicacion LIKE ?)";
      const like = `%${busqueda}%`;
      params.push(like, like, like);
    }
    if (precioMax) {
      sql += " AND s.Precio <= ?";
      params.push(precioMax);
    }

    sql += " GROUP BY s.Id_Servicio";

    if (calificacionMin) {
      sql += " HAVING Calificacion_Promedio >= ?";
      params.push(calificacionMin);
    }

    if (orden === "precio_asc") sql += " ORDER BY s.Precio ASC";
    else if (orden === "precio_desc") sql += " ORDER BY s.Precio DESC";
    else if (orden === "calificacion") sql += " ORDER BY Calificacion_Promedio DESC";

    const result = await client.query(sql, params);
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener los servicios", error: String(error) };
  }
};

export const getServicioPorId = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      `SELECT
         s.*, c.Nombre_Categoria, u.Nombre AS Nombre_Trabajador, u.Ubicacion, u.Telefono
       FROM servicios s
       JOIN usuarios u ON s.Id_Trabajador = u.Id_Usuario
       JOIN categorias c ON s.Id_Categoria = c.Id_Categoria
       WHERE s.Id_Servicio = ?`,
      [id]
    );
    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Servicio no encontrado" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = result[0];
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener el servicio", error: String(error) };
  }
};

export const crearServicio = async (ctx: Context) => {
  try {
    const body: Partial<Servicio> = await ctx.request.body.json();
    const { Id_Trabajador, Id_Categoria, Titulo, Descripcion, Precio, TipoServicio } = body;

    if (!Id_Trabajador || !Id_Categoria || !Titulo || Precio === undefined) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: "Id_Trabajador, Id_Categoria, Titulo y Precio son obligatorios",
      };
      return;
    }

    await client.execute(
      `INSERT INTO servicios (Id_Trabajador, Id_Categoria, Titulo, Descripcion, Precio, TipoServicio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Id_Trabajador, Id_Categoria, Titulo, Descripcion ?? null, Precio, TipoServicio ?? null]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Servicio creado correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear el servicio", error: String(error) };
  }
};

export const actualizarServicio = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const body: Partial<Servicio> = await ctx.request.body.json();
    const { Id_Categoria, Titulo, Descripcion, Precio, TipoServicio } = body;

    await client.execute(
      `UPDATE servicios
       SET Id_Categoria = ?, Titulo = ?, Descripcion = ?, Precio = ?, TipoServicio = ?
       WHERE Id_Servicio = ?`,
      [Id_Categoria, Titulo, Descripcion ?? null, Precio, TipoServicio ?? null, id]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Servicio actualizado correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al actualizar el servicio", error: String(error) };
  }
};

export const eliminarServicio = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    await client.execute("DELETE FROM servicios WHERE Id_Servicio = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Servicio eliminado correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar el servicio", error: String(error) };
  }
};