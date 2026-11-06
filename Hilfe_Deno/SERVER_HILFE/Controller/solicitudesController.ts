import { Context, RouterContext } from "../Dependencies/dependencies.ts";
import client, { nuevaConexion } from "../Models/conexion.ts";
import type { Solicitud, EstadoSolicitud } from "../Models/solicitudesModel.ts";

const TRANSICIONES_VALIDAS: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  pendiente: ["aceptado", "rechazado", "cancelada"],
  aceptado: ["en_proceso", "cancelada"],
  en_proceso: ["rumbo_a_ubicacion"],
  rumbo_a_ubicacion: ["trabajo_realizado"],
  // La única operación que finaliza un servicio es el pago en la billetera.
  trabajo_realizado: [],
  rechazado: [],
  finalizado: [],
  cancelada: [],
};

export const getSolicitudes = async (ctx: Context) => {
  try {
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const usuarioId = Number(sesion?.id);
    const rol = Number(sesion?.rol);
    if (!usuarioId || ![1, 2, 3].includes(rol)) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "Inicia sesión para consultar solicitudes." };
      return;
    }
    const url = ctx.request.url;
    const cliente = rol === 3 ? String(usuarioId) : url.searchParams.get("cliente");
    const trabajador = rol === 2 ? String(usuarioId) : url.searchParams.get("trabajador");
    const estado = url.searchParams.get("estado");

    let sql = `
      SELECT
        sol.*, s.Titulo AS Titulo_Servicio,
        uc.Nombre AS Nombre_Cliente,
        ut.Nombre AS Nombre_Trabajador,
        CASE WHEN EXISTS (
          SELECT 1 FROM calificaciones c WHERE c.Id_Solicitud = sol.Id_Solicitud
        ) THEN 1 ELSE 0 END AS Calificada
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
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const usuarioId = Number(sesion?.id);
    const rol = Number(sesion?.rol);
    if (!usuarioId || ![1, 2, 3].includes(rol)) {
      ctx.response.status = 401;
      ctx.response.body = { mensaje: "Inicia sesión para consultar la solicitud." };
      return;
    }
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
    const solicitud = result[0];
    if (rol !== 1 && Number(solicitud.Id_Cliente) !== usuarioId && Number(solicitud.Id_Trabajador) !== usuarioId) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "No tienes permiso para consultar esta solicitud." };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = solicitud;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error al obtener la solicitud", error: String(error) };
  }
};

export const crearSolicitud = async (ctx: Context) => {
  let db: Awaited<ReturnType<typeof nuevaConexion>> | undefined;
  let enTransaccion = false;
  try {
    const body = await ctx.request.body.json() as Partial<Solicitud> & { porcentajeAbono?: number };
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
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const porcentajeAbono = Number(body.porcentajeAbono);

    if (!Id_Cliente || !Id_Trabajador || !Id_Servicio || !Fecha_Servicio || !Hora_Servicio) {
      ctx.response.status = 400;
      ctx.response.body = {
        mensaje: "Id_Cliente, Id_Trabajador, Id_Servicio, Fecha_Servicio y Hora_Servicio son obligatorios",
      };
      return;
    }
    if (Number(sesion?.rol) !== 3 || Number(sesion?.id) !== Number(Id_Cliente)) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Inicia sesión como cliente para enviar una solicitud desde tu propia cuenta" };
      return;
    }
    if (![25, 50, 100].includes(porcentajeAbono)) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Elige un abono del 25%, 50% o 100% del servicio." };
      return;
    }

    db = await nuevaConexion();
    await db.execute("START TRANSACTION");
    enTransaccion = true;
    // Locking the worker row serializes bookings from concurrent requests for that worker.
    const trabajador = await db.query(
      "SELECT Id_Usuario, Verificado, Estado_Verificacion FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = 2 FOR UPDATE",
      [Id_Trabajador]
    );
    if (!trabajador.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "No se encontró el trabajador." };
      return;
    }
    if (Number(trabajador[0].Verificado) !== 1 || trabajador[0].Estado_Verificacion !== "aprobado") {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Este trabajador no está habilitado para recibir solicitudes." };
      return;
    }
    const cliente = await db.query(
      "SELECT Id_Usuario FROM usuarios WHERE Id_Usuario = ? AND Id_Rol = 3 AND Verificado = 1 AND Estado_Verificacion = 'aprobado'",
      [Id_Cliente]
    );
    if (!cliente.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Tu cuenta debe estar aprobada para solicitar servicios." };
      return;
    }
    const servicio = await db.query(
      "SELECT Id_Servicio, Precio, Titulo FROM servicios WHERE Id_Servicio = ? AND Id_Trabajador = ? FOR UPDATE",
      [Id_Servicio, Id_Trabajador]
    );
    if (!servicio.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "El servicio no corresponde a este trabajador." };
      return;
    }
    const precio = Number(servicio[0].Precio);
    if (!Number.isFinite(precio) || precio <= 0) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 409;
      ctx.response.body = { mensaje: "Este servicio no tiene un precio válido para reservar." };
      return;
    }
    const valorAbono = Math.round(precio * porcentajeAbono) / 100;
    const cobroAbono = Math.round(valorAbono * 1.05 * 100) / 100;

    await db.execute("INSERT IGNORE INTO wallets (user_id, balance) VALUES (?, 0)", [Id_Cliente]);
    const billeteras = await db.query(
      "SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [Id_Cliente]
    );
    if (!billeteras.length) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 503;
      ctx.response.body = { mensaje: "No se pudo abrir tu billetera. Intenta de nuevo." };
      return;
    }
    const saldoDisponible = Number(billeteras[0].balance);
    if (saldoDisponible < cobroAbono) {
      await db.execute("ROLLBACK");
      enTransaccion = false;
      ctx.response.status = 402;
      ctx.response.body = {
        codigo: "SALDO_INSUFICIENTE",
        mensaje: `Necesitas ${cobroAbono.toLocaleString("es-CO")} COP para abonar el ${porcentajeAbono}% (incluye 5% de comisión). Tu saldo disponible es ${saldoDisponible.toLocaleString("es-CO")} COP. Recarga tu billetera y vuelve a intentarlo.`,
        saldoNecesario: cobroAbono,
        saldoDisponible,
      };
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

    const resultadoSolicitud = await db.execute(
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
    const idSolicitud = Number(resultadoSolicitud.lastInsertId);
    await db.execute(
      `INSERT INTO transactions (wallet_id, solicitud_id, type, amount, description, status)
       VALUES (?, ?, 'payment', ?, ?, 'completed')`,
      [billeteras[0].id, idSolicitud, cobroAbono, `Abono del ${porcentajeAbono}% para ${servicio[0].Titulo} (incluye 5% Hilf'e)`]
    );
    await db.execute("UPDATE wallets SET balance = balance - ? WHERE id = ?", [cobroAbono, billeteras[0].id]);
    await db.execute("COMMIT");
    enTransaccion = false;

    ctx.response.status = 201;
    ctx.response.body = {
      mensaje: `Solicitud creada. Se abonaron ${cobroAbono.toLocaleString("es-CO")} COP (${porcentajeAbono}% del servicio).`,
      estado: "pendiente",
      idSolicitud,
      porcentajeAbono,
      abono: cobroAbono,
      saldoDisponible: Math.round((saldoDisponible - cobroAbono) * 100) / 100,
    };
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
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const usuarioId = Number(sesion?.id);
    const rol = Number(sesion?.rol);
    if (!usuarioId || (rol !== 1 && rol !== 2)) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Solo el trabajador asignado o un administrador puede cambiar el estado." };
      return;
    }

    const body: Partial<Solicitud> = await ctx.request.body.json();
    const nuevoEstado = body.Estado_Solicitudes as EstadoSolicitud;

    if (!nuevoEstado) {
      ctx.response.status = 400;
      ctx.response.body = { mensaje: "Estado_Solicitudes es obligatorio" };
      return;
    }

    const actual = await client.query(
      "SELECT Estado_Solicitudes, Id_Trabajador FROM solicitudes WHERE Id_Solicitud = ?",
      [id]
    );
    if (actual.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }

    if (rol !== 1 && Number(actual[0].Id_Trabajador) !== usuarioId) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "No puedes modificar una solicitud asignada a otro trabajador." };
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

    // Si el trabajador rechaza o se cancela una reserva, devuelve al cliente
    // cualquier abono registrado al agendar, en la misma transacción del cambio.
    if (nuevoEstado === "rechazado" || nuevoEstado === "cancelada") {
      const db = await nuevaConexion();
      let enTransaccion = false;
      try {
        await db.execute("START TRANSACTION");
        enTransaccion = true;
        const solicitudes = await db.query(
          "SELECT Id_Cliente, Estado_Solicitudes FROM solicitudes WHERE Id_Solicitud = ? FOR UPDATE",
          [id]
        );
        const solicitud = solicitudes[0];
        if (!solicitud || solicitud.Estado_Solicitudes !== estadoActual) {
          await db.execute("ROLLBACK");
          enTransaccion = false;
          ctx.response.status = 409;
          ctx.response.body = { mensaje: "La solicitud cambió mientras se procesaba. Actualiza e intenta de nuevo." };
          return;
        }
        const pagos = await db.query(
          "SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE solicitud_id = ? AND type = 'payment'",
          [id]
        );
        const reembolsos = await db.query(
          "SELECT id FROM transactions WHERE solicitud_id = ? AND type = 'refund' LIMIT 1",
          [id]
        );
        const montoReembolso = Number(pagos[0]?.total || 0);
        if (montoReembolso > 0 && !reembolsos.length) {
          const wallets = await db.query("SELECT id FROM wallets WHERE user_id = ? FOR UPDATE", [solicitud.Id_Cliente]);
          if (!wallets.length) throw new Error("No se encontró la billetera para devolver el abono.");
          await db.execute(
            `INSERT INTO transactions (wallet_id, solicitud_id, type, amount, description, status)
             VALUES (?, ?, 'refund', ?, 'Reembolso de abono por cancelación del servicio', 'completed')`,
            [wallets[0].id, id, montoReembolso]
          );
          await db.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", [montoReembolso, wallets[0].id]);
        }
        await db.execute("UPDATE solicitudes SET Estado_Solicitudes = ? WHERE Id_Solicitud = ?", [nuevoEstado, id]);
        await db.execute("COMMIT");
        enTransaccion = false;
        ctx.response.status = 200;
        ctx.response.body = {
          mensaje: `Solicitud actualizada a '${nuevoEstado}'${montoReembolso > 0 ? `; se devolvieron ${montoReembolso.toLocaleString("es-CO")} COP a la billetera del cliente` : ""}`,
          reembolso: montoReembolso,
        };
        return;
      } catch (error) {
        if (enTransaccion) await db.execute("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        await db.close().catch(() => {});
      }
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
    const sesion = ctx.state.usuario as { id?: number; rol?: number } | undefined;
    const usuarioId = Number(sesion?.id);
    const rol = Number(sesion?.rol);
    if (!usuarioId || (rol !== 1 && rol !== 2 && rol !== 3)) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "Inicia sesión para eliminar una solicitud." };
      return;
    }

    const actual = await client.query(
      "SELECT Estado_Solicitudes, Id_Cliente, Id_Trabajador FROM solicitudes WHERE Id_Solicitud = ?",
      [id]
    );
    if (actual.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { mensaje: "Solicitud no encontrada" };
      return;
    }

    const esParte = usuarioId === Number(actual[0].Id_Cliente) || usuarioId === Number(actual[0].Id_Trabajador);
    if (rol !== 1 && !esParte) {
      ctx.response.status = 403;
      ctx.response.body = { mensaje: "No puedes eliminar una solicitud de otra cuenta." };
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
