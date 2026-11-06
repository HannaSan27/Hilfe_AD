import { Router } from "../Dependencies/dependencies.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";
import {
  getDisponibilidad,
  getDisponibilidadPorId,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
  reemplazarDisponibilidadServicio,
} from "../Controller/disponibilidadController.ts";

const router = new Router();

router
  .get("/api/disponibilidad", getDisponibilidad)
  .put("/api/disponibilidad/servicio/:id", verificarSesion, reemplazarDisponibilidadServicio)
  .get("/api/disponibilidad/:id", getDisponibilidadPorId)
  .post("/api/disponibilidad", verificarSesion, crearDisponibilidad)
  .put("/api/disponibilidad/:id", verificarSesion, actualizarDisponibilidad)
  .delete("/api/disponibilidad/:id", verificarSesion, eliminarDisponibilidad);

export default router;
