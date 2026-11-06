import { Router } from "../Dependencies/dependencies.ts";
import client from "../Models/conexion.ts";

const healthRoutes = new Router();

healthRoutes.get("/api/health", async (ctx) => {
  try {
    await client.query("SELECT 1 AS ok");
    ctx.response.status = 200;
    ctx.response.body = { ok: true, api: "ok", database: "ok" };
  } catch (error) {
    console.error("Health check de Deno/MySQL falló:", error);
    ctx.response.status = 503;
    ctx.response.body = { ok: false, api: "ok", database: "unavailable" };
  }
});

export default healthRoutes;
