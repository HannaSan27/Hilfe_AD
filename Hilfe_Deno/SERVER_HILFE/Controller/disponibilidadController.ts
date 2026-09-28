import { Context } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";
import type { Disponibilidad } from "../Models/disponibilidadModel.ts";

export const getDisponibilidad = async (ctx: Context) => {
  try {
    const url = ctx.request.url;
    const servicio = url.searchParams.get("servicio");

    let sql = "SELECT * FROM disponibilidad WHERE 1 = 1";
    const params: unknown[] = [];

    if (servicio) {
      sql += " AND Id_Servicio = ?";
      params.push(servicio);
    }

    sql += " ORDER BY Id_Servicio, FIELD(Dia_Semana, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')";

    const result = await client.query(sql, params);
    ctx.response.status = 200;
    ctx.response.body = result;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la disponibilidad", error: String(error) };
  }
};

export const getDisponibilidadPorId = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const result = await client.query(
      "SELECT * FROM disponibilidad WHERE Id_Disponibilidad = ?",
      [id]
    );
    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Disponibilidad no encontrada" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = result[0];
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la disponibilidad", error: String(error) };
  }
};

export const crearDisponibilidad = async (ctx: Context) => {
  try {
    const body: Partial<Disponibilidad> = await ctx.request.body.json();
    const { Id_Servicio, Dia_Semana, Hora_Inicio, Hora_Fin } = body;

    if (!Id_Servicio || !Dia_Semana || !Hora_Inicio || !Hora_Fin) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: "Id_Servicio, Dia_Semana, Hora_Inicio y Hora_Fin son obligatorios",
      };
      return;
    }

    if (Hora_Inicio >= Hora_Fin) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Hora_Inicio debe ser anterior a Hora_Fin" };
      return;
    }

    await client.execute(
      "INSERT INTO disponibilidad (Id_Servicio, Dia_Semana, Hora_Inicio, Hora_Fin) VALUES (?, ?, ?, ?)",
      [Id_Servicio, Dia_Semana, Hora_Inicio, Hora_Fin]
    );

    ctx.response.status = 201;
    ctx.response.body = { mensaje: "Disponibilidad creada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al crear la disponibilidad", error: String(error) };
  }
};

export const actualizarDisponibilidad = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    const body: Partial<Disponibilidad> = await ctx.request.body.json();
    const { Dia_Semana, Hora_Inicio, Hora_Fin } = body;

    if (Hora_Inicio && Hora_Fin && Hora_Inicio >= Hora_Fin) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Hora_Inicio debe ser anterior a Hora_Fin" };
      return;
    }

    await client.execute(
      "UPDATE disponibilidad SET Dia_Semana = ?, Hora_Inicio = ?, Hora_Fin = ? WHERE Id_Disponibilidad = ?",
      [Dia_Semana, Hora_Inicio, Hora_Fin, id]
    );

    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Disponibilidad actualizada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al actualizar la disponibilidad", error: String(error) };
  }
};

export const eliminarDisponibilidad = async (ctx: Context) => {
  const { id } = ctx.params as { id: string };
  try {
    await client.execute("DELETE FROM disponibilidad WHERE Id_Disponibilidad = ?", [id]);
    ctx.response.status = 200;
    ctx.response.body = { mensaje: "Disponibilidad eliminada correctamente" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al eliminar la disponibilidad", error: String(error) };
  }
};