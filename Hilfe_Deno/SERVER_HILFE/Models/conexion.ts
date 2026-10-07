import { Client } from "./../Dependencies/dependencies.ts";

const config = {
  hostname: Deno.env.get("DB_HOST") || "localhost",
  port: Number(Deno.env.get("DB_PORT")) || 3306,
  username: Deno.env.get("DB_USER") || "root",
  password: Deno.env.get("DB_PASSWORD") || "",
  db: Deno.env.get("DB_NAME") || "hilfe",
  charset: "utf8mb4",
};

export const nuevaConexion = () => new Client().connect(config);

const client = await nuevaConexion();

export default client;
