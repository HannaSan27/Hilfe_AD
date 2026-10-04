export type EstadoSolicitud =
  | "pendiente"
  | "aceptado"
  | "rechazado"
  | "en_proceso"
  | "rumbo_a_ubicacion"
  | "trabajo_realizado"
  | "finalizado"
  | "cancelada";

export interface Solicitud {
  Id_Solicitud: number;
  Id_Cliente: number;
  Id_Trabajador: number;
  Id_Servicio: number;
  Fecha_Servicio: string;
  Hora_Servicio: string;
  Estado_Solicitudes: EstadoSolicitud;
  Direccion: string | null;
  Telefono: string | null;
  Descripcion_Solicitud: string | null;
}
