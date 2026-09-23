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
  console.log("Dados de entrega das reservas prontos.");
} finally {
  await connection.end();
}
