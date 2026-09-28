import { Router } from "./../Dependencies/dependencies.ts";
import { obtenerTrabajadores, obtenerTrabajadorPorId } from "./../Controller/trabajadoresController.ts";

const trabajadoresRoutes = new Router();

trabajadoresRoutes.get("/api/trabajadores", obtenerTrabajadores);
trabajadoresRoutes.get("/api/trabajadores/:id", obtenerTrabajadorPorId);

export default trabajadoresRoutes;