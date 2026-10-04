-- Add a persistent verification flag without changing existing user data.
-- Safe to run more than once; existing values are preserved when the column exists.
SET @hilfe_verificado_existe := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'Verificado'
);

SET @hilfe_verificado_sql := IF(
  @hilfe_verificado_existe = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `Verificado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `Estado`',
  'SELECT ''usuarios.Verificado ya existe'' AS migration_status'
);

PREPARE hilfe_verificado_stmt FROM @hilfe_verificado_sql;
EXECUTE hilfe_verificado_stmt;
DEALLOCATE PREPARE hilfe_verificado_stmt;
