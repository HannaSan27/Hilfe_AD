import { Context, RouterContext } from "../Dependencies/dependencies.ts";
import client, { nuevaConexion } from "../Models/conexion.ts";
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

export const getHorariosOcupados = async (ctx: Context) => {
  try {
    const trabajador = ctx.request.url.searchParams.get("trabajador");
    const fecha = ctx.request.url.searchParams.get("fecha");
    if (!trabajador || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Trabajador y fecha válida son obligatorios." };
      return;
    }
    const result = await client.query(
      `SELECT DISTINCT TIME_FORMAT(sol.Hora_Servicio, '%H:%i') AS Hora_Servicio
       FROM solicitudes sol
       WHERE sol.Id_Trabajador = ? AND sol.Fecha_Servicio = ?
         AND sol.Estado_Solicitudes NOT IN ('rechazado', 'cancelada')
       ORDER BY Hora_Servicio`,
      [trabajador, fecha]
    );
    ctx.response.status = 200;
    ctx.response.body = result.map((row: { Hora_Servicio: string }) => row.Hora_Servicio);
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al consultar horarios ocupados", error: String(error) };
  }
};

export const getSolicitudPorId = async (ctx: RouterContext<string>) => {
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
  let db: Awaited<ReturnType<typeof nuevaConexion>> | undefined;
  let enTransaccion = false;
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

    db = await nuevaConexion();
    await db.execute("START TRANSACTION");
    enTransaccion = true;
    // Locking the worker row serializes bookings from concurrent requests for that worker.
    const trabajador = await db.query("SELECT Id_Usuario FROM usuarios WHERE Id_Usuario = ? FOR UPDATE", [Id_Trabajador]);
    if (!trabajador.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "No se encontró el trabajador." };
      return;
    }
    const servicio = await db.query("SELECT Id_Servicio FROM servicios WHERE Id_Servicio = ? AND Id_Trabajador = ?", [Id_Servicio, Id_Trabajador]);
    if (!servicio.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "El servicio no corresponde a este trabajador." };
      return;
    }
    const dateValue = String(Fecha_Servicio).slice(0, 10);
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaSemana = dias[date.getUTCDay()];
    const hora = String(Hora_Servicio).slice(0, 5);
    const disponibilidad = await db.query(
      `SELECT Id_Disponibilidad FROM disponibilidad
       WHERE Id_Servicio = ? AND Dia_Semana = ? AND Hora_Inicio <= ? AND Hora_Fin > ? LIMIT 1`,
      [Id_Servicio, diaSemana, hora, hora]
    );
    if (!disponibilidad.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "El horario seleccionado está fuera de la disponibilidad publicada del trabajador." };
      return;
    }
    const ocupado = await db.query(
      `SELECT Id_Solicitud FROM solicitudes
       WHERE Id_Trabajador = ? AND Fecha_Servicio = ? AND Hora_Servicio = ?
         AND Estado_Solicitudes NOT IN ('rechazado', 'cancelada') LIMIT 1`,
      [Id_Trabajador, dateValue, hora]
    );
    if (ocupado.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "Ese horario ya está ocupado. Selecciona otra hora." };
      return;
    }

    await db.execute(
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
    await db.execute("COMMIT");
    enTransaccion = false;

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Solicitud creada correctamente", estado: "pendiente" };
  } catch (error) {
    if (db && enTransaccion) await db.execute("ROLLBACK").catch(() => {});
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear la solicitud", error: String(error) };
  } finally {
    if (db) await db.close().catch(() => {});
  }
};

export const cambiarEstadoSolicitud = async (ctx: RouterContext<string>) => {
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

export const eliminarSolicitud = async (ctx: RouterContext<string>) => {
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
