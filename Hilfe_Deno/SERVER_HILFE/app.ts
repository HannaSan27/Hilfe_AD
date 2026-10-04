import { Application } from "./Dependencies/dependencies.ts";
import { oakCors } from "jsr:@tajpouria/cors";
import authRoutes from "./Routes/authRoutes.ts";
import usuariosRoutes from "./Routes/usuariosRoutes.ts";
import trabajadoresRoutes from "./Routes/trabajadoresRoutes.ts";
import calificacionesRoutes from "./Routes/calificacionesRoutes.ts";
import categoriasRoutes from "./Routes/categoriasRoutes.ts";
import serviciosRoutes from "./Routes/serviciosRoutes.ts";
import disponibilidadRoutes from "./Routes/disponibilidadRoutes.ts";
import imagenesTrabajosRoutes from "./Routes/imagenesTrabajosRoutes.ts";
import solicitudesRoutes from "./Routes/solicitudesRoutes.ts";

const app = new Application();

// Permite que el frontend (en otro puerto, 4321) pueda llamar a este backend (puerto 8000)
app.use(oakCors());

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(usuariosRoutes.routes());
app.use(usuariosRoutes.allowedMethods());

app.use(trabajadoresRoutes.routes());
app.use(trabajadoresRoutes.allowedMethods());

app.use(calificacionesRoutes.routes());
app.use(calificacionesRoutes.allowedMethods());

app.use(categoriasRoutes.routes());
app.use(categoriasRoutes.allowedMethods());

app.use(serviciosRoutes.routes());
app.use(serviciosRoutes.allowedMethods());

app.use(disponibilidadRoutes.routes());
app.use(disponibilidadRoutes.allowedMethods());

app.use(imagenesTrabajosRoutes.routes());
app.use(imagenesTrabajosRoutes.allowedMethods());

app.use(solicitudesRoutes.routes());
app.use(solicitudesRoutes.allowedMethods());

const puerto = Number(Deno.env.get("PORT")) || 8000;
console.log(`Servidor corriendo por el puerto ${puerto}`);
await app.listen({ port: puerto });
