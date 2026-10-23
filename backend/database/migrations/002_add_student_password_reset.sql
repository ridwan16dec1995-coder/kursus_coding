-- Additive migration for student password reset tokens.
CREATE TABLE IF NOT EXISTS `student_password_reset_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `token_hash` CHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
);
