import { Client } from "./../Dependencies/dependencies.ts";

const client = await new Client().connect({
  hostname: Deno.env.get("DB_HOST") || "localhost",
  port: Number(Deno.env.get("DB_PORT")) || 3306,
  username: Deno.env.get("DB_USER") || "root",
  password: Deno.env.get("DB_PASSWORD") || "",
  db: Deno.env.get("DB_NAME") || "hilfe",
  charset: "utf8mb4",
});

export default client;