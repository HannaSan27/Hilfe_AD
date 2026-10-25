import { Router } from "./../Dependencies/dependencies.ts";
import {
  registrarCalificacion,
  obtenerCalificacionesTrabajador,
  getArchivoFotoCalificacion,
} from "./../Controller/calificacionesController.ts";
import { verificarSesion } from "./../Middlewares/authMiddleware.ts";

const calificacionesRoutes = new Router();

calificacionesRoutes.post("/api/calificaciones", verificarSesion, registrarCalificacion);
calificacionesRoutes.get("/api/calificaciones/trabajador/:id", obtenerCalificacionesTrabajador);
calificacionesRoutes.get("/api/calificaciones/:id/fotos/:indice/archivo", getArchivoFotoCalificacion);

export default calificacionesRoutes;