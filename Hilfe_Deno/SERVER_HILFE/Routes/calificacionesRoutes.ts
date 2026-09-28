import { Router } from "./../Dependencies/dependencies.ts";
import { registrarCalificacion, obtenerCalificacionesTrabajador } from "./../Controller/calificacionesController.ts";
import { verificarSesion } from "./../Middlewares/authMiddleware.ts";

const calificacionesRoutes = new Router();

calificacionesRoutes.post("/api/calificaciones", verificarSesion, registrarCalificacion);
calificacionesRoutes.get("/api/calificaciones/trabajador/:id", obtenerCalificacionesTrabajador);

export default calificacionesRoutes;