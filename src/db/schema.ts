import { mysqlTable, varchar, text, decimal, int, timestamp } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('products', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: int('stock').notNull().default(1),
  categoryId: varchar('category_id', { length: 50 }).notNull().default('roupas'),
  subcategory: varchar('subcategory', { length: 50 }).notNull().default('geral'),
  gender: varchar('gender', { length: 30 }).notNull().default('feminino'), // Aceita feminino, masculino, infantil-menino, infantil-menina
  size: varchar('size', { length: 10 }).notNull().default('M'),
  status: varchar('status', { length: 20 }).notNull().default('AVAILABLE'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  

  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
});

export const productImages = mysqlTable('product_images', {
  id: varchar('id', { length: 36 }).primaryKey(),
  url: text('url').notNull(),
  isMain: int('is_main').notNull().default(0),
  productId: varchar('product_id', { length: 36 }).notNull(),
});