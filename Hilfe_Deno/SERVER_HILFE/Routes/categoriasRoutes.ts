import { Router } from "../Dependencies/dependencies.ts";
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
  .post("/api/categorias", crearCategoria)
  .put("/api/categorias/:id", actualizarCategoria)
  .delete("/api/categorias/:id", eliminarCategoria);

export default router;
