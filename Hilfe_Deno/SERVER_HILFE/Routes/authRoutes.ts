import { Router } from "./../Dependencies/dependencies.ts";
import { registrar, login, solicitarRecuperacion, verificarCodigo, restablecerContrasena } from "./../Controller/authController.ts";

const authRoutes = new Router();

authRoutes.post("/api/auth/registro", registrar);
authRoutes.post("/api/auth/login", login);
authRoutes.post("/api/auth/recuperar/solicitar", solicitarRecuperacion);
authRoutes.post("/api/auth/recuperar/verificar", verificarCodigo);
authRoutes.post("/api/auth/recuperar/nueva-contrasena", restablecerContrasena);

export default authRoutes;