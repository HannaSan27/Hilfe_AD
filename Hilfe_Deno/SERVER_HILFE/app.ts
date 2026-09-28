import { Application, Context } from "./Dependencies/dependencies.ts";
import categoriasRouter from "./Routes/categoriasRoutes.ts";
import serviciosRouter from "./Routes/serviciosRoutes.ts";
import solicitudesRouter from "./Routes/solicitudesRoutes.ts";
import disponibilidadRouter from "./Routes/disponibilidadRoutes.ts";
import imagenesTrabajosRouter from "./Routes/imagenesTrabajosRoutes.ts";

const app = new Application();


app.use(async (ctx: Context, next: () => Promise<unknown>) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }
  await next();
});


app.use(async (ctx: Context, next: () => Promise<unknown>) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { mensaje: "Error interno del servidor", error: String(err) };
  }
});

app.use(categoriasRouter.routes());
app.use(categoriasRouter.allowedMethods());

app.use(serviciosRouter.routes());
app.use(serviciosRouter.allowedMethods());

app.use(solicitudesRouter.routes());
app.use(solicitudesRouter.allowedMethods());

app.use(disponibilidadRouter.routes());
app.use(disponibilidadRouter.allowedMethods());

app.use(imagenesTrabajosRouter.routes());
app.use(imagenesTrabajosRouter.allowedMethods());

const PORT = Number(Deno.env.get("PORT")) || 8000;

console.log(`Servidor corriendo en http://localhost:8000`);
await app.listen({ port: PORT });