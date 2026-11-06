import { Router } from "../Dependencies/dependencies.ts";
import { verificarSesion } from "../Middlewares/authMiddleware.ts";
import {
  getCategorias,
  getCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "../Controller/categoriasController.ts";

const router = new Router();

router
  .get("/api/categorias", getCategorias)
  .get("/api/categorias/:id", getCategoriaPorId)
  .post("/api/categorias", verificarSesion, crearCategoria)
  .put("/api/categorias/:id", verificarSesion, actualizarCategoria)
  .delete("/api/categorias/:id", verificarSesion, eliminarCategoria);

export default router;
