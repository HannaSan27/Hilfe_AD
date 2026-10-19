import { Context, RouterContext } from "../Dependencies/dependencies.ts";
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
      WHERE u.Verificado = 1 AND u.Estado_Verificacion = 'aprobado'
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

export const getServicioPorId = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      `SELECT
         s.*, c.Nombre_Categoria, u.Nombre AS Nombre_Trabajador, u.Ubicacion, u.Telefono
       FROM servicios s
       JOIN usuarios u ON s.Id_Trabajador = u.Id_Usuario
       JOIN categorias c ON s.Id_Categoria = c.Id_Categoria
       WHERE s.Id_Servicio = ? AND u.Verificado = 1 AND u.Estado_Verificacion = 'aprobado'`,
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
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;

    if (Number(sesion?.rol) !== 2 || Number(sesion?.id) !== Number(Id_Trabajador)) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Solo puedes publicar servicios desde tu propia cuenta de trabajador" };
      return;
    }

    if (!Id_Trabajador || !Id_Categoria || !Titulo || Precio === undefined) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: "Id_Trabajador, Id_Categoria, Titulo y Precio son obligatorios",
      };
      return;
    }

    // Validación de seguridad: el trabajador debe estar aprobado para publicar servicios
    const trabajadores = await client.query(
      "SELECT Id_Usuario, Verificado, Estado_Verificacion FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = 2",
      [Id_Trabajador]
    );

    if (trabajadores.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "El trabajador especificado no existe" };
      return;
    }

    const trabajador = trabajadores[0];
    if (Number(trabajador.Verificado) !== 1 || trabajador.Estado_Verificacion !== "aprobado") {
      ctx.response.status = 403;
      ctx.response.body = {
        mensaje: "Tu cuenta de trabajador está en verificación. No puedes publicar servicios hasta que tu identidad sea aprobada por el administrador.",
      };
      return;
    }

    const resultado = await client.execute(
      `INSERT INTO servicios (Id_Trabajador, Id_Categoria, Titulo, Descripcion, Precio, TipoServicio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Id_Trabajador, Id_Categoria, Titulo, Descripcion ?? null, Precio, TipoServicio ?? null]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Servicio creado correctamente", Id_Servicio: Number(resultado.lastInsertId) };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear el servicio", error: String(error) };
  }
};

export const actualizarServicio = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const servicioActual = await client.query(
      `SELECT s.Id_Trabajador, u.Verificado, u.Estado_Verificacion
       FROM servicios s JOIN usuarios u ON u.Id_Usuario = s.Id_Trabajador
       WHERE s.Id_Servicio = ?`,
      [id]
    );
    if (!servicioActual.length) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Servicio no encontrado" };
      return;
    }
    const esAdmin = Number(sesion?.rol) === 1;
    const esPropietario = Number(sesion?.rol) === 2 && Number(sesion?.id) === Number(servicioActual[0].Id_Trabajador);
    if (!esAdmin && !esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "No tienes permiso para editar este servicio" };
      return;
    }
    if (esPropietario && (Number(servicioActual[0].Verificado) !== 1 || servicioActual[0].Estado_Verificacion !== "aprobado")) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Tu cuenta debe estar aprobada para publicar o editar servicios" };
      return;
    }
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

export const eliminarServicio = async (ctx: RouterContext<string>) => {
  const { id } = ctx.params as { id: string };
  try {
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const servicioActual = await client.query(
      `SELECT s.Id_Trabajador, u.Verificado, u.Estado_Verificacion
       FROM servicios s JOIN usuarios u ON u.Id_Usuario = s.Id_Trabajador
       WHERE s.Id_Servicio = ?`,
      [id]
    );
    if (!servicioActual.length) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Servicio no encontrado" };
      return;
    }
    const esAdmin = Number(sesion?.rol) === 1;
    const esPropietario = Number(sesion?.rol) === 2 && Number(sesion?.id) === Number(servicioActual[0].Id_Trabajador);
    if (!esAdmin && !esPropietario) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "No tienes permiso para eliminar este servicio" };
      return;
    }
    await client.execute("DELETE FROM servicios WHERE Id_Servicio = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Servicio eliminado correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar el servicio", error: String(error) };
  }
};
