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
  reservedQuantity: int('reserved_quantity').notNull().default(0),
  soldQuantity: int('sold_quantity').notNull().default(0),
});

export const productImages = mysqlTable('product_images', {
  id: varchar('id', { length: 36 }).primaryKey(),
  url: text('url').notNull(),
  isMain: int('is_main').notNull().default(0),
  productId: varchar('product_id', { length: 36 }).notNull(),
});

export const reservations = mysqlTable('reservations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
  deliveryMethod: varchar('delivery_method', { length: 20 }),
  deliveryNeighborhood: varchar('delivery_neighborhood', { length: 120 }),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }),
  deliveryRecipient: varchar('delivery_recipient', { length: 255 }),
  deliveryPhone: varchar('delivery_phone', { length: 30 }),
  deliveryStreet: varchar('delivery_street', { length: 255 }),
  deliveryNumber: varchar('delivery_number', { length: 30 }),
  deliveryComplement: varchar('delivery_complement', { length: 255 }),
  deliveryReference: varchar('delivery_reference', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const reservationItems = mysqlTable('reservation_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  reservationId: varchar('reservation_id', { length: 36 }).notNull(),
  productId: varchar('product_id', { length: 36 }).notNull(),
  quantity: int('quantity').notNull(),
});

export const whatsappSettings = mysqlTable('whatsapp_settings', {
  id: int('id').primaryKey(),
  enabled: int('enabled').notNull().default(1),
  disconnectRequested: int('disconnect_requested').notNull().default(0),
  connectedPhone: varchar('connected_phone', { length: 30 }),
  qrCode: text('qr_code'),
  connectionError: varchar('connection_error', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const whatsappHandoffs = mysqlTable('whatsapp_handoffs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerJid: varchar('customer_jid', { length: 120 }).notNull().unique(),
  customerPhone: varchar('customer_phone', { length: 30 }).notNull(),
  lastMessage: text('last_message').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
