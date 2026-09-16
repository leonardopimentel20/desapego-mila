import { db } from "../../../db";
import { products } from "../../../db/schema";
import { and, gte, like, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({
      id: products.id,
      title: products.title,
    })
    .from(products)
    .where(and(
      like(products.title, `%${query}%`),
      ne(products.status, "SOLD"),
      gte(products.stock, 1)
    ))
    .limit(5);

  return NextResponse.json(results);
}
