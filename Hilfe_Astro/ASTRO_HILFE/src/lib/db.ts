import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: import.meta.env.DB_HOST ?? '127.0.0.1',
  user: import.meta.env.DB_USER ?? 'root',
  password: import.meta.env.DB_PASSWORD ?? '',
  database: import.meta.env.DB_NAME ?? 'hilfe',
  port: Number(import.meta.env.DB_PORT ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
});
