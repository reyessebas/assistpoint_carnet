-- Migracion: URLs publicas de carnets por token seguro.
-- Ajusta @public_app_url antes de ejecutar en produccion.
SET @public_app_url := 'http://localhost:4200';

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_secure_card_share_tokens$$

CREATE PROCEDURE migrate_secure_card_share_tokens()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'carnets'
      AND COLUMN_NAME = 'qr_token'
  ) THEN
    ALTER TABLE carnets ADD COLUMN qr_token VARCHAR(120) NULL AFTER codigo_carnet;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'carnets'
      AND COLUMN_NAME = 'qr_url'
  ) THEN
    ALTER TABLE carnets ADD COLUMN qr_url VARCHAR(500) NULL AFTER qr_token;
  END IF;

  UPDATE carnets
  SET qr_token = UUID()
  WHERE qr_token IS NULL OR qr_token = '';

  UPDATE carnets
  SET qr_url = CONCAT(TRIM(TRAILING '/' FROM @public_app_url), '/public-card/', qr_token)
  WHERE qr_token IS NOT NULL
    AND qr_token <> ''
    AND (qr_url IS NULL OR qr_url = '' OR qr_url NOT LIKE '%/public-card/%');

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'carnets'
      AND INDEX_NAME = 'ux_carnets_token'
  ) THEN
    ALTER TABLE carnets ADD UNIQUE KEY ux_carnets_token (qr_token);
  END IF;

  ALTER TABLE carnets MODIFY qr_token VARCHAR(120) NOT NULL;
  ALTER TABLE carnets MODIFY qr_url VARCHAR(500) NOT NULL;
END$$

DELIMITER ;

CALL migrate_secure_card_share_tokens();
DROP PROCEDURE migrate_secure_card_share_tokens;
