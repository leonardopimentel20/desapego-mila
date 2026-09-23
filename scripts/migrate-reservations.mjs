import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reservations (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reservation_items (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      reservation_id VARCHAR(36) NOT NULL,
      product_id VARCHAR(36) NOT NULL,
      quantity INT NOT NULL,
      INDEX reservation_items_reservation_id_idx (reservation_id),
      INDEX reservation_items_product_id_idx (product_id)
    ) ENGINE=InnoDB
  `);
  console.log("Tabelas reservations e reservation_items prontas.");
} finally {
  await connection.end();
}
