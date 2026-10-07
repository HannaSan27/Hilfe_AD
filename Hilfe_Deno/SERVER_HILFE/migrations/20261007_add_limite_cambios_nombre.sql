-- Track the number of real full-name changes during the current calendar month.
SET @hilfe_nombre_cambios_existe := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'Nombre_Cambios_Mes'
);
SET @hilfe_nombre_cambios_sql := IF(
  @hilfe_nombre_cambios_existe = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `Nombre_Cambios_Mes` INT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT ''usuarios.Nombre_Cambios_Mes ya existe'' AS migration_status'
);
PREPARE hilfe_nombre_cambios_stmt FROM @hilfe_nombre_cambios_sql;
EXECUTE hilfe_nombre_cambios_stmt;
DEALLOCATE PREPARE hilfe_nombre_cambios_stmt;

SET @hilfe_mes_nombre_existe := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'Mes_Cambio_Nombre'
);
SET @hilfe_mes_nombre_sql := IF(
  @hilfe_mes_nombre_existe = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `Mes_Cambio_Nombre` CHAR(7) NULL',
  'SELECT ''usuarios.Mes_Cambio_Nombre ya existe'' AS migration_status'
);
PREPARE hilfe_mes_nombre_stmt FROM @hilfe_mes_nombre_sql;
EXECUTE hilfe_mes_nombre_stmt;
DEALLOCATE PREPARE hilfe_mes_nombre_stmt;
