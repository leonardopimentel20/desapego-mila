import { db } from "../../../db";
import { products } from "../../../db/schema";
import { like } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({
      id: products.id,
      title: products.title,
    })
    .from(products)
    .where(like(products.title, `%${query}%`))
    .limit(5);

  return NextResponse.json(results);
}