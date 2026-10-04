import { Router } from "./../Dependencies/dependencies.ts";
import {
  obtenerTrabajadores,
  obtenerTrabajadorPorId,
  actualizarVerificacionTrabajador,
} from "./../Controller/trabajadoresController.ts";
import { verificarSesion } from "./../Middlewares/authMiddleware.ts";

const trabajadoresRoutes = new Router();

trabajadoresRoutes.get("/api/trabajadores", obtenerTrabajadores);
trabajadoresRoutes.get("/api/trabajadores/:id", obtenerTrabajadorPorId);
trabajadoresRoutes.put("/api/trabajadores/:id/verificacion", verificarSesion, actualizarVerificacionTrabajador);

export default trabajadoresRoutes;
