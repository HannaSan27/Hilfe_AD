import client from "../Models/conexion.ts";

export async function aplicarMigraciones() {
  console.log("Comprobando migraciones de base de datos...");

  // 1. Columnas en usuarios
  const columnasExistentes = await client.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
  `);
  const nombresColumnas = new Set(columnasExistentes.map((c: { COLUMN_NAME: string }) => c.COLUMN_NAME));

  if (!nombresColumnas.has("Tipo_Documento")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Tipo_Documento` VARCHAR(20) NULL AFTER `Verificado`");
    console.log("Columna usuarios.Tipo_Documento agregada.");
  }

  if (!nombresColumnas.has("Numero_Documento")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Numero_Documento` VARCHAR(30) NULL AFTER `Tipo_Documento`");
    console.log("Columna usuarios.Numero_Documento agregada.");
  }

  if (!nombresColumnas.has("Fecha_Expedicion_Documento")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Fecha_Expedicion_Documento` DATE NULL AFTER `Numero_Documento`");
    console.log("Columna usuarios.Fecha_Expedicion_Documento agregada.");
  }

  if (!nombresColumnas.has("Estado_Verificacion")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Estado_Verificacion` ENUM('pendiente', 'en_revision', 'aprobado', 'requiere_informacion', 'rechazado') NOT NULL DEFAULT 'pendiente' AFTER `Fecha_Expedicion_Documento`");
    console.log("Columna usuarios.Estado_Verificacion agregada.");
  }

  if (!nombresColumnas.has("Categoria_Profesional")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Categoria_Profesional` INT NULL");
  }
  if (!nombresColumnas.has("Experiencia")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Experiencia` VARCHAR(40) NULL");
  }
  if (!nombresColumnas.has("Descripcion_Profesional")) {
    await client.execute("ALTER TABLE `usuarios` ADD COLUMN `Descripcion_Profesional` TEXT NULL");
  }

  // Sincronizar verificados
  await client.execute(`
    UPDATE usuarios
    SET Estado_Verificacion = 'aprobado'
    WHERE Verificado = 1 AND (Estado_Verificacion = 'pendiente' OR Estado_Verificacion IS NULL)
  `);

  // 2. Tabla solicitudes_verificacion
  await client.execute(`
    CREATE TABLE IF NOT EXISTS solicitudes_verificacion (
      Id_Solicitud_Verificacion INT AUTO_INCREMENT PRIMARY KEY,
      Id_Usuario INT NOT NULL,
      Tipo_Documento VARCHAR(20) NOT NULL,
      Numero_Documento VARCHAR(30) NOT NULL,
      Fecha_Expedicion_Documento DATE NOT NULL,
      Estado ENUM('pendiente', 'en_revision', 'aprobado', 'requiere_informacion', 'rechazado') NOT NULL DEFAULT 'pendiente',
      Notas_Admin TEXT NULL,
      Motivo_Rechazo TEXT NULL,
      Informacion_Requerida TEXT NULL,
      Revisado_Por INT NULL,
      Fecha_Revision DATETIME NULL,
      Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      Fecha_Actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sol_verif_usuario (Id_Usuario),
      INDEX idx_sol_verif_estado (Estado),
      CONSTRAINT fk_sol_verif_usuario FOREIGN KEY (Id_Usuario) REFERENCES usuarios (Id_Usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Tabla terminos_legales
  await client.execute(`
    CREATE TABLE IF NOT EXISTS terminos_legales (
      Id_Termino INT AUTO_INCREMENT PRIMARY KEY,
      Codigo_Documento VARCHAR(50) NOT NULL,
      Titulo VARCHAR(150) NOT NULL,
      Version VARCHAR(20) NOT NULL,
      Contenido LONGTEXT NOT NULL,
      Es_Vigente TINYINT(1) NOT NULL DEFAULT 1,
      Fecha_Vigencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_terminos_codigo_version (Codigo_Documento, Version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Tabla aceptaciones_legales
  await client.execute(`
    CREATE TABLE IF NOT EXISTS aceptaciones_legales (
      Id_Aceptacion INT AUTO_INCREMENT PRIMARY KEY,
      Id_Usuario INT NOT NULL,
      Codigo_Documento VARCHAR(50) NOT NULL,
      Version VARCHAR(20) NOT NULL,
      Fecha_Aceptacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      Direccion_IP VARCHAR(45) NULL,
      User_Agent VARCHAR(255) NULL,
      Accion_Afirmativa VARCHAR(100) NOT NULL DEFAULT 'checkbox_confirmacion_manual',
      INDEX idx_aceptaciones_usuario (Id_Usuario),
      CONSTRAINT fk_aceptaciones_usuario FOREIGN KEY (Id_Usuario) REFERENCES usuarios (Id_Usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Tablas requeridas por la billetera del frontend
  await client.execute(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_wallets_usuario FOREIGN KEY (user_id) REFERENCES usuarios (Id_Usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      wallet_id INT NOT NULL,
      solicitud_id INT NULL,
      type ENUM('deposit', 'withdraw', 'payment', 'refund') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transactions_wallet_created (wallet_id, created_at),
      INDEX idx_transactions_solicitud_type (solicitud_id, type),
      CONSTRAINT fk_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE,
      CONSTRAINT fk_transactions_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes (Id_Solicitud) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS codigos_verificacion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      accion ENUM('recargar', 'retirar') NOT NULL,
      monto DECIMAL(12,2) NOT NULL,
      banco VARCHAR(50) NOT NULL,
      codigo_hash CHAR(64) NOT NULL,
      intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
      usado TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expira_at DATETIME NOT NULL,
      INDEX idx_codigos_usuario_accion_usado (user_id, accion, usado),
      INDEX idx_codigos_usuario_creado (user_id, created_at),
      CONSTRAINT fk_codigos_usuario FOREIGN KEY (user_id) REFERENCES usuarios (Id_Usuario) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Migraciones aplicadas correctamente.");
}

if (import.meta.main) {
  try {
    await aplicarMigraciones();
    await client.close();
    Deno.exit(0);
  } catch (error) {
    console.error("Error al aplicar migraciones:", error);
    await client.close();
    Deno.exit(1);
  }
}
