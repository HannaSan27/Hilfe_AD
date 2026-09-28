import { Router } from "../Dependencies/dependencies.ts";
import {
  getServicios,
  getServicioPorId,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} from "../Controller/serviciosController.ts";

const router = new Router();

router
  .get("/api/servicios", getServicios)
  .get("/api/servicios/:id", getServicioPorId)
  .post("/api/servicios", crearServicio)
  .put("/api/servicios/:id", actualizarServicio)
  .delete("/api/servicios/:id", eliminarServicio);

export default router;