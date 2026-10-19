-- Migración: Verificación de Identidad, Historial de Solicitudes y Aceptación de Términos Legales (Colombia)
-- hilfe database - MySQL / MariaDB compatible

-- 1. Agregar columnas a usuarios usando INFORMATION_SCHEMA para MySQL y MariaDB.
SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Tipo_Documento');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Tipo_Documento` VARCHAR(20) NULL AFTER `Verificado`', 'SELECT ''usuarios.Tipo_Documento ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Numero_Documento');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Numero_Documento` VARCHAR(30) NULL AFTER `Tipo_Documento`', 'SELECT ''usuarios.Numero_Documento ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Fecha_Expedicion_Documento');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Fecha_Expedicion_Documento` DATE NULL AFTER `Numero_Documento`', 'SELECT ''usuarios.Fecha_Expedicion_Documento ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Estado_Verificacion');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Estado_Verificacion` ENUM(''pendiente'', ''en_revision'', ''aprobado'', ''requiere_informacion'', ''rechazado'') NOT NULL DEFAULT ''pendiente'' AFTER `Fecha_Expedicion_Documento`', 'SELECT ''usuarios.Estado_Verificacion ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

-- Datos del perfil profesional separados de los datos privados de identidad.
SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Categoria_Profesional');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Categoria_Profesional` INT NULL', 'SELECT ''usuarios.Categoria_Profesional ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Experiencia');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Experiencia` VARCHAR(40) NULL', 'SELECT ''usuarios.Experiencia ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

SET @hilfe_columna := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'Descripcion_Profesional');
SET @hilfe_sql := IF(@hilfe_columna = 0, 'ALTER TABLE `usuarios` ADD COLUMN `Descripcion_Profesional` TEXT NULL', 'SELECT ''usuarios.Descripcion_Profesional ya existe''');
PREPARE hilfe_stmt FROM @hilfe_sql; EXECUTE hilfe_stmt; DEALLOCATE PREPARE hilfe_stmt;

-- Sincronizar compatibilidad: los usuarios previamente verificados pasan a aprobado
UPDATE `usuarios`
SET `Estado_Verificacion` = 'aprobado'
WHERE `Verificado` = 1 AND `Estado_Verificacion` = 'pendiente';

UPDATE `usuarios`
SET `Verificado` = 1
WHERE `Estado_Verificacion` = 'aprobado';

-- 2. Tabla de historial y auditoría de solicitudes de verificación
CREATE TABLE IF NOT EXISTS `solicitudes_verificacion` (
  `Id_Solicitud_Verificacion` INT AUTO_INCREMENT PRIMARY KEY,
  `Id_Usuario` INT NOT NULL,
  `Tipo_Documento` VARCHAR(20) NOT NULL,
  `Numero_Documento` VARCHAR(30) NOT NULL,
  `Fecha_Expedicion_Documento` DATE NOT NULL,
  `Estado` ENUM('pendiente', 'en_revision', 'aprobado', 'requiere_informacion', 'rechazado') NOT NULL DEFAULT 'pendiente',
  `Notas_Admin` TEXT NULL,
  `Motivo_Rechazo` TEXT NULL,
  `Informacion_Requerida` TEXT NULL,
  `Revisado_Por` INT NULL,
  `Fecha_Revision` DATETIME NULL,
  `Fecha_Creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `Fecha_Actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sol_verif_usuario` (`Id_Usuario`),
  INDEX `idx_sol_verif_estado` (`Estado`),
  CONSTRAINT `fk_sol_verif_usuario` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de versiones de términos y políticas legales (Colombia Ley 1581 de 2012)
CREATE TABLE IF NOT EXISTS `terminos_legales` (
  `Id_Termino` INT AUTO_INCREMENT PRIMARY KEY,
  `Codigo_Documento` VARCHAR(50) NOT NULL,
  `Titulo` VARCHAR(150) NOT NULL,
  `Version` VARCHAR(20) NOT NULL,
  `Contenido` LONGTEXT NOT NULL,
  `Es_Vigente` TINYINT(1) NOT NULL DEFAULT 1,
  `Fecha_Vigencia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_terminos_codigo_version` (`Codigo_Documento`, `Version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de evidencia de aceptaciones legales con trazabilidad de versión
CREATE TABLE IF NOT EXISTS `aceptaciones_legales` (
  `Id_Aceptacion` INT AUTO_INCREMENT PRIMARY KEY,
  `Id_Usuario` INT NOT NULL,
  `Codigo_Documento` VARCHAR(50) NOT NULL,
  `Version` VARCHAR(20) NOT NULL,
  `Fecha_Aceptacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `Direccion_IP` VARCHAR(45) NULL,
  `User_Agent` VARCHAR(255) NULL,
  `Accion_Afirmativa` VARCHAR(100) NOT NULL DEFAULT 'checkbox_confirmacion_manual',
  INDEX `idx_aceptaciones_usuario` (`Id_Usuario`),
  CONSTRAINT `fk_aceptaciones_usuario` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
