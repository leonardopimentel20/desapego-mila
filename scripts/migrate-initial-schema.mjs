import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está configurada.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL DEFAULT 1,
      category_id VARCHAR(50) NOT NULL DEFAULT 'roupas',
      subcategory VARCHAR(50) NOT NULL DEFAULT 'geral',
      gender VARCHAR(30) NOT NULL DEFAULT 'feminino',
      size VARCHAR(10) NOT NULL DEFAULT 'M',
      status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      customer_name VARCHAR(255) NULL,
      customer_phone VARCHAR(50) NULL,
      reserved_quantity INT NOT NULL DEFAULT 0,
      sold_quantity INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS product_images (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      url TEXT NOT NULL,
      is_main INT NOT NULL DEFAULT 0,
      product_id VARCHAR(36) NOT NULL,
      INDEX product_images_product_id_idx (product_id)
    ) ENGINE=InnoDB
  `);

  console.log("Tabelas base products e product_images prontas.");
} finally {
  await connection.end();
}
