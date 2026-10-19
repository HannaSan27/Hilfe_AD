import { Router } from "../Dependencies/dependencies.ts";
import {
  listarVerificacionesAdmin,
  detalleVerificacionAdmin,
  aprobarSolicitudAdmin,
  solicitarInfoAdmin,
  rechazarSolicitudAdmin,
  ponerEnRevisionAdmin,
  miEstadoVerificacion,
  corregirMiVerificacion,
  listarDocumentosLegales,
} from "../Controller/verificacionesController.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";

const verificacionesRoutes = new Router();

// Rutas de administración de verificaciones (protegidas con sesión de admin)
verificacionesRoutes.get("/api/admin/verificaciones", verificarSesion, listarVerificacionesAdmin);
verificacionesRoutes.get("/api/admin/verificaciones/:id", verificarSesion, detalleVerificacionAdmin);
verificacionesRoutes.put("/api/admin/verificaciones/:id/aprobar", verificarSesion, aprobarSolicitudAdmin);
verificacionesRoutes.put("/api/admin/verificaciones/:id/solicitar-info", verificarSesion, solicitarInfoAdmin);
verificacionesRoutes.put("/api/admin/verificaciones/:id/rechazar", verificarSesion, rechazarSolicitudAdmin);
verificacionesRoutes.put("/api/admin/verificaciones/:id/en-revision", verificarSesion, ponerEnRevisionAdmin);

// Estado propio del usuario autenticado
verificacionesRoutes.get("/api/verificaciones/mi-estado", verificarSesion, miEstadoVerificacion);
verificacionesRoutes.put("/api/verificaciones/mi-solicitud", verificarSesion, corregirMiVerificacion);

// Documentos legales vigentes (público)
verificacionesRoutes.get("/api/legal/documentos", listarDocumentosLegales);

export default verificacionesRoutes;
