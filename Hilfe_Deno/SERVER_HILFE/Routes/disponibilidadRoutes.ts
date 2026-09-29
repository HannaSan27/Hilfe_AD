import { Router } from "../Dependencies/dependencies.ts";
import {
  getDisponibilidad,
  getDisponibilidadPorId,
  crearDisponibilidad,
  actualizarDisponibilidad,
  eliminarDisponibilidad,
} from "../Controller/disponibilidadController.ts";

const router = new Router();

router
  .get("/api/disponibilidad", getDisponibilidad)
  .get("/api/disponibilidad/:id", getDisponibilidadPorId)
  .post("/api/disponibilidad", crearDisponibilidad)
  .put("/api/disponibilidad/:id", actualizarDisponibilidad)
  .delete("/api/disponibilidad/:id", eliminarDisponibilidad);

export default router;