import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS whatsapp_settings (
      id INT NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      disconnect_requested TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await connection.execute(`
    ALTER TABLE whatsapp_settings
      ADD COLUMN connected_phone VARCHAR(30) NULL
  `).catch((error) => {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  });
  await connection.execute(`
    ALTER TABLE whatsapp_settings
      ADD COLUMN qr_code TEXT NULL
  `).catch((error) => {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  });
  await connection.execute(`
    ALTER TABLE whatsapp_settings
      ADD COLUMN connection_error VARCHAR(255) NULL
  `).catch((error) => {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  });
  await connection.execute(`
    INSERT INTO whatsapp_settings (id, enabled, disconnect_requested)
    VALUES (1, 1, 0)
    ON DUPLICATE KEY UPDATE id = id
  `);
} finally {
  await connection.end();
}
