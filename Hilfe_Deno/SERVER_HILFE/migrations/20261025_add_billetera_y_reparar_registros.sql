-- Crear las tablas usadas por el registro, la billetera y sus códigos de seguridad.
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_wallet_user` (`user_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `wallet_id` INT NOT NULL,
  `solicitud_id` INT NULL,
  `type` ENUM('deposit', 'withdraw', 'payment', 'refund') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `description` VARCHAR(255) NULL,
  `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transactions_wallet_date` (`wallet_id`, `created_at`, `id`),
  INDEX `idx_transactions_solicitud` (`solicitud_id`),
  CONSTRAINT `fk_transactions_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`Id_Solicitud`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `codigos_verificacion` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `accion` VARCHAR(20) NOT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `banco` VARCHAR(60) NOT NULL DEFAULT '',
  `codigo_hash` CHAR(64) NOT NULL,
  `intentos` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `expira_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wallet_code_user` (`user_id`, `accion`, `usado`, `id`),
  INDEX `idx_wallet_code_recent` (`user_id`, `created_at`),
  CONSTRAINT `fk_wallet_code_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear una billetera en cero a usuarios previos y recuperar registros que
-- quedaron incompletos antes de existir esas tablas.
INSERT IGNORE INTO `wallets` (`user_id`, `balance`)
SELECT `Id_Usuario`, 0 FROM `usuarios`;

INSERT INTO `solicitudes_verificacion`
  (`Id_Usuario`, `Tipo_Documento`, `Numero_Documento`, `Fecha_Expedicion_Documento`, `Estado`)
SELECT u.`Id_Usuario`, u.`Tipo_Documento`, u.`Numero_Documento`,
       u.`Fecha_Expedicion_Documento`, u.`Estado_Verificacion`
  FROM `usuarios` u
  LEFT JOIN `solicitudes_verificacion` v ON v.`Id_Usuario` = u.`Id_Usuario`
 WHERE u.`Id_Rol` IN (2, 3)
   AND u.`Tipo_Documento` IS NOT NULL
   AND u.`Numero_Documento` IS NOT NULL
   AND u.`Fecha_Expedicion_Documento` IS NOT NULL
   AND v.`Id_Solicitud_Verificacion` IS NULL;
