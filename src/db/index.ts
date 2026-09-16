import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não está configurada.");
}

const poolConnection = mysql.createPool({
  uri: databaseUrl,
});

export const db = drizzle(poolConnection, { schema, mode: "default" });
