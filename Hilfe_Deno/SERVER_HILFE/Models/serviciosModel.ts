export interface Servicio {
  Id_Servicio: number;
  Id_Trabajador: number;
  Id_Categoria: number;
  Titulo: string;
  Descripcion: string | null;
  Precio: number;
  Fecha_Creacion: string;
  TipoServicio: string | null;
}