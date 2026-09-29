import { Router } from "./../Dependencies/dependencies.ts";
import { obtenerPerfil, editarPerfil } from "./../Controller/usuariosController.ts";
import { verificarSesion } from "./../Middlewares/authMiddleware.ts";

const usuariosRoutes = new Router();

usuariosRoutes.get("/api/usuarios/:id", obtenerPerfil);
usuariosRoutes.put("/api/usuarios/:id", verificarSesion, editarPerfil);

export default usuariosRoutes;