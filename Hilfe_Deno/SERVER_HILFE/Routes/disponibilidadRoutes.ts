import { Router } from "../Dependencies/dependencies.ts";
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
  .put("/api/disponibilidad/servicio/:id", reemplazarDisponibilidadServicio)
  .get("/api/disponibilidad/:id", getDisponibilidadPorId)
  .post("/api/disponibilidad", crearDisponibilidad)
  .put("/api/disponibilidad/:id", actualizarDisponibilidad)
  .delete("/api/disponibilidad/:id", eliminarDisponibilidad);

export default router;
