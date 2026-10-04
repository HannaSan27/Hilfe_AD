import { Router } from "../Dependencies/dependencies.ts";
import {
  getImagenesTrabajos,
  getImagenTrabajoPorId,
  getArchivoImagenTrabajo,
  crearImagenTrabajo,
  eliminarImagenTrabajo,
} from "../Controller/imagenesTrabajosController.ts";

const router = new Router();

router
  .get("/api/imagenes-trabajos", getImagenesTrabajos)
  .get("/api/imagenes-trabajos/:id/archivo", getArchivoImagenTrabajo)
  .get("/api/imagenes-trabajos/:id", getImagenTrabajoPorId)
  .post("/api/imagenes-trabajos", crearImagenTrabajo)
  .delete("/api/imagenes-trabajos/:id", eliminarImagenTrabajo);

export default router;
