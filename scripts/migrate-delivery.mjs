import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  for (const statement of [
    "ALTER TABLE reservations ADD COLUMN delivery_method VARCHAR(20) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_neighborhood VARCHAR(120) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_fee DECIMAL(10, 2) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_recipient VARCHAR(255) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_phone VARCHAR(30) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_street VARCHAR(255) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_number VARCHAR(30) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_complement VARCHAR(255) NULL",
    "ALTER TABLE reservations ADD COLUMN delivery_reference VARCHAR(255) NULL",
  ]) {
    await connection.execute(statement).catch((error) => {
      if (error?.code !== "ER_DUP_FIELDNAME") throw error;
    });
  }
  await connection.execute(`CREATE TABLE IF NOT EXISTS delivery_settings (
    id INT NOT NULL PRIMARY KEY,
    enabled TINYINT NOT NULL DEFAULT 0,
    origin_street VARCHAR(255) NULL,
    origin_number VARCHAR(30) NULL,
    origin_neighborhood VARCHAR(120) NULL,
    origin_latitude DECIMAL(10, 7) NULL,
    origin_longitude DECIMAL(10, 7) NULL,
    minimum_fee_cents INT NULL,
    per_km_cents INT NULL,
    round_trip TINYINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await connection.execute("INSERT IGNORE INTO delivery_settings (id) VALUES (1)");
  await connection.execute(`CREATE TABLE IF NOT EXISTS delivery_api_usage (
    usage_day DATE NOT NULL PRIMARY KEY,
    credits INT NOT NULL DEFAULT 0,
    next_request_at BIGINT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log("Dados de entrega das reservas prontos.");
} finally {
  await connection.end();
}
