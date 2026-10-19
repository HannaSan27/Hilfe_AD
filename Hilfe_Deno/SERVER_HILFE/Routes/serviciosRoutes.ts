import { Router } from "../Dependencies/dependencies.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";
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
  .post("/api/servicios", verificarSesion, crearServicio)
  .put("/api/servicios/:id", verificarSesion, actualizarServicio)
  .delete("/api/servicios/:id", verificarSesion, eliminarServicio);

export default router;
