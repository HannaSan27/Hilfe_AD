import { Context } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { Solicitud, EstadoSolicitud } from "../Models/solicitudesModel.ts";

const TRANSICIONES_VALIDAS: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  pendiente: ["aceptado", "rechazado", "cancelada"],
  aceptado: ["en_proceso", "cancelada"],
  en_proceso: ["rumbo_a_ubicacion"],
  rumbo_a_ubicacion: ["trabajo_realizado"],
  trabajo_realizado: ["finalizado"],
  rechazado: [],
  finalizado: [],
  cancelada: [],
};

export const getSolicitudes = async (ctx: Context) => {
  try {
    const url = ctx.request.url;
    const cliente = url.searchParams.get("cliente");
    const trabajador = url.searchParams.get("trabajador");
    const estado = url.searchParams.get("estado");

    let sql = `
      SELECT
        sol.*, s.Titulo AS Titulo_Servicio,
        uc.Nombre AS Nombre_Cliente,
        ut.Nombre AS Nombre_Trabajador
      FROM solicitudes sol
      JOIN servicios s ON sol.Id_Servicio = s.Id_Servicio
      JOIN usuarios uc ON sol.Id_Cliente = uc.Id_Usuario
      JOIN usuarios ut ON sol.Id_Trabajador = ut.Id_Usuario
      WHERE 1 = 1
    `;
    const params: unknown[] = [];

    if (cliente) {
      sql += " AND sol.Id_Cliente = ?";
      params.push(cliente);
    }
    if (trabajador) {
      sql += " AND sol.Id_Trabajador = ?";
      params.push(trabajador);
    }
    if (estado) {
      sql += " AND sol.Estado_Solicitudes = ?";
      params.push(estado);
    }

    sql += " ORDER BY sol.Fecha_Servicio DESC, sol.Hora_Servicio DESC";

    const result = await client.query(sql, params);
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener las solicitudes", error: String(error) };
  }
};

export const getSolicitudPorId = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      `SELECT
         sol.*, s.Titulo AS Titulo_Servicio,
         uc.Nombre AS Nombre_Cliente,
         ut.Nombre AS Nombre_Trabajador
       FROM solicitudes sol
       JOIN servicios s ON sol.Id_Servicio = s.Id_Servicio
       JOIN usuarios uc ON sol.Id_Cliente = uc.Id_Usuario
       JOIN usuarios ut ON sol.Id_Trabajador = ut.Id_Usuario
       WHERE sol.Id_Solicitud = ?`,
      [id]
    );
    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = result[0];
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la solicitud", error: String(error) };
  }
};

export const crearSolicitud = async (ctx: Context) => {
  try {
    const body: Partial<Solicitud> = await ctx.request.body.json();
    const {
      Id_Cliente,
      Id_Trabajador,
      Id_Servicio,
      Fecha_Servicio,
      Hora_Servicio,
      Direccion,
      Telefono,
      Descripcion_Solicitud,
    } = body;

    if (!Id_Cliente || !Id_Trabajador || !Id_Servicio || !Fecha_Servicio || !Hora_Servicio) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: "Id_Cliente, Id_Trabajador, Id_Servicio, Fecha_Servicio y Hora_Servicio son obligatorios",
      };
      return;
    }

    await client.execute(
      `INSERT INTO solicitudes
         (Id_Cliente, Id_Trabajador, Id_Servicio, Fecha_Servicio, Hora_Servicio,
          Estado_Solicitudes, Direccion, Telefono, Descripcion_Solicitud)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
      [
        Id_Cliente,
        Id_Trabajador,
        Id_Servicio,
        Fecha_Servicio,
        Hora_Servicio,
        Direccion ?? null,
        Telefono ?? null,
        Descripcion_Solicitud ?? null,
      ]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Solicitud creada correctamente", estado: "pendiente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear la solicitud", error: String(error) };
  }
};

export const cambiarEstadoSolicitud = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const body: Partial<Solicitud> = await ctx.request.body.json();
    const nuevoEstado = body.Estado_Solicitudes as EstadoSolicitud;

    if (!nuevoEstado) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Estado_Solicitudes es obligatorio" };
      return;
    }

    const actual = await client.query(
      "SELECT Estado_Solicitudes FROM solicitudes WHERE Id_Solicitud = ?",
      [id]
    );
    if (actual.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }

    const estadoActual = actual[0].Estado_Solicitudes as EstadoSolicitud;
    const permitidos = TRANSICIONES_VALIDAS[estadoActual] ?? [];

    if (!permitidos.includes(nuevoEstado)) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: `No se puede pasar de '${estadoActual}' a '${nuevoEstado}'`,
        transicionesPermitidas: permitidos,
      };
      return;
    }

    await client.execute(
      "UPDATE solicitudes SET Estado_Solicitudes = ? WHERE Id_Solicitud = ?",
      [nuevoEstado, id]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: `Solicitud actualizada a '${nuevoEstado}'` };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al cambiar el estado", error: String(error) };
  }
};

export const eliminarSolicitud = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const actual = await client.query(
      "SELECT Estado_Solicitudes FROM solicitudes WHERE Id_Solicitud = ?",
      [id]
    );
    if (actual.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }

    const estadoActual = actual[0].Estado_Solicitudes as EstadoSolicitud;
    if (!["pendiente", "rechazado", "cancelada"].includes(estadoActual)) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: `No se puede eliminar una solicitud en estado '${estadoActual}'`,
      };
      return;
    }

    await client.execute("DELETE FROM solicitudes WHERE Id_Solicitud = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Solicitud eliminada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar la solicitud", error: String(error) };
  }
};