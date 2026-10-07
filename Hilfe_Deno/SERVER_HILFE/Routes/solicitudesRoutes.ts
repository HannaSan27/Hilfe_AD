import { Router } from "../Dependencies/dependencies.ts";
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
  .get("/api/solicitudes", getSolicitudes)
  .get("/api/solicitudes/:id", getSolicitudPorId)
  .post("/api/solicitudes", crearSolicitud)
  .put("/api/solicitudes/:id/estado", cambiarEstadoSolicitud)
  .delete("/api/solicitudes/:id", eliminarSolicitud);

export default router;
