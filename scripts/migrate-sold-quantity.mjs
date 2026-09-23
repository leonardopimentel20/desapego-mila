import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está configurada.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute(`
    ALTER TABLE products
      ADD COLUMN sold_quantity INT NOT NULL DEFAULT 0
  `).catch(async (error) => {
    if (error?.code !== "ER_DUP_FIELDNAME") throw error;
  });

  await connection.execute(`
    UPDATE products
    SET sold_quantity = 1
    WHERE status = 'SOLD' AND sold_quantity = 0
  `);

  console.log("Coluna sold_quantity pronta.");
} finally {
  await connection.end();
}
