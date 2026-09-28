import { Application } from "./Dependencies/dependencies.ts";
import authRoutes from "./Routes/authRoutes.ts";
import usuariosRoutes from "./Routes/usuariosRoutes.ts";
import trabajadoresRoutes from "./Routes/trabajadoresRoutes.ts";
import calificacionesRoutes from "./Routes/calificacionesRoutes.ts";

const app = new Application();

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(usuariosRoutes.routes());
app.use(usuariosRoutes.allowedMethods());

app.use(trabajadoresRoutes.routes());
app.use(trabajadoresRoutes.allowedMethods());

app.use(calificacionesRoutes.routes());
app.use(calificacionesRoutes.allowedMethods());

const puerto = Number(Deno.env.get("PORT")) || 8000;
console.log(`Servidor corriendo por el puerto ${puerto}`);
await app.listen({ port: puerto });