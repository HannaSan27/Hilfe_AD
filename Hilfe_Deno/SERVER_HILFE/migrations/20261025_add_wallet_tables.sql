-- Tablas faltantes requeridas por la billetera de Astro.
-- Migración aditiva: no altera ni elimina tablas o datos existentes.

CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wallets_usuario` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `wallet_id` INT NOT NULL,
  `solicitud_id` INT NULL,
  `type` ENUM('deposit', 'withdraw', 'payment', 'refund') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transactions_wallet_created` (`wallet_id`, `created_at`),
  INDEX `idx_transactions_solicitud_type` (`solicitud_id`, `type`),
  CONSTRAINT `fk_transactions_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`Id_Solicitud`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `codigos_verificacion` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `accion` ENUM('recargar', 'retirar') NOT NULL,
  `monto` DECIMAL(12,2) NOT NULL,
  `banco` VARCHAR(50) NOT NULL,
  `codigo_hash` CHAR(64) NOT NULL,
  `intentos` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `usado` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expira_at` DATETIME NOT NULL,
  INDEX `idx_codigos_usuario_accion_usado` (`user_id`, `accion`, `usado`),
  INDEX `idx_codigos_usuario_creado` (`user_id`, `created_at`),
  CONSTRAINT `fk_codigos_usuario` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`Id_Usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
