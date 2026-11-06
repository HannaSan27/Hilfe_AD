import { Router } from "../Dependencies/dependencies.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";
import {
  getSolicitudes,
  getSolicitudPorId,
  crearSolicitud,
  getHorariosOcupados,
  cambiarEstadoSolicitud,
  eliminarSolicitud,
} from "../Controller/solicitudesController.ts";

const router = new Router();

router
  .get("/api/solicitudes/horarios-ocupados", getHorariosOcupados)
  .get("/api/solicitudes", verificarSesion, getSolicitudes)
  .get("/api/solicitudes/:id", verificarSesion, getSolicitudPorId)
  .post("/api/solicitudes", verificarSesion, crearSolicitud)
  .put("/api/solicitudes/:id/estado", verificarSesion, cambiarEstadoSolicitud)
  .delete("/api/solicitudes/:id", verificarSesion, eliminarSolicitud);

export default router;
