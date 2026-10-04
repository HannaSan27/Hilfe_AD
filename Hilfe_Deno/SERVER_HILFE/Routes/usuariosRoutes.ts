import { Router } from "./../Dependencies/dependencies.ts";
import {
  obtenerPerfil,
  editarPerfil,
  subirFotoPerfil,
  obtenerFotoPerfil,
} from "./../Controller/usuariosController.ts";
import { verificarSesion } from "./../Middlewares/authMiddleware.ts";

const usuariosRoutes = new Router();

usuariosRoutes.get("/api/usuarios/:id", obtenerPerfil);
usuariosRoutes.put("/api/usuarios/:id", verificarSesion, editarPerfil);
usuariosRoutes.post("/api/usuarios/:id/foto-perfil", verificarSesion, subirFotoPerfil);
usuariosRoutes.get("/api/usuarios/:id/foto-perfil", obtenerFotoPerfil);

export default usuariosRoutes;
