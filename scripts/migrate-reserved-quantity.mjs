import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [columns] = await connection.execute(
    `SELECT COUNT(*) AS quantity
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'reserved_quantity'`
  );

  if (Number(columns[0].quantity) === 0) {
    await connection.execute(
      "ALTER TABLE products ADD COLUMN reserved_quantity INT NOT NULL DEFAULT 0 AFTER customer_phone"
    );
    console.log("Coluna reserved_quantity criada.");
  } else {
    console.log("Coluna reserved_quantity já existe.");
  }
} finally {
  await connection.end();
}
