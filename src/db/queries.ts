import { db } from "./index";
import { products, productImages } from "./schema";
import { eq, and, or, gte, like, sql } from "drizzle-orm";

export async function getAvailableProducts(
  searchQuery = "", 
  categoryFilter = "", 
  sizeFilter = "", 
  subCategoryFilter = "", 
  genderFilter = "todos",
  sortBy = "recentes"
) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  let orderByClause;
  if (sortBy === "menor") {
    orderByClause = sql`${products.price} ASC`;
  } else if (sortBy === "maior") {
    orderByClause = sql`${products.price} DESC`;
  } else {
    orderByClause = sql`CASE WHEN ${products.categoryId} = 'novidades' THEN 0 ELSE 1 END, ${products.id} DESC`;
  }

  let genderCondition = undefined;
  if (genderFilter && genderFilter !== "todos") {
    if (genderFilter === "infantil") {
      genderCondition = or(eq(products.gender, 'infantil-menino'), eq(products.gender, 'infantil-menina'));
    } else {
      genderCondition = eq(products.gender, genderFilter);
    }
  }

  const query = db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      size: products.size,
      status: products.status,
      updatedAt: products.updatedAt,
      categoryId: products.categoryId,
      subcategory: products.subcategory,
      gender: products.gender,
      imageUrl: sql<string>`(SELECT url FROM product_images WHERE product_images.product_id = products.id ORDER BY is_main DESC, id ASC LIMIT 1)`,
    })
    .from(products)
    .where(
      and(
        searchQuery ? like(products.title, `%${searchQuery}%`) : undefined,
        categoryFilter && categoryFilter !== "todos" ? eq(products.categoryId, categoryFilter) : undefined,
        subCategoryFilter && subCategoryFilter !== "todas" && subCategoryFilter !== "" ? eq(products.subcategory, subCategoryFilter) : undefined,
        genderCondition,
        sizeFilter && sizeFilter !== "todos" ? eq(products.size, sizeFilter) : undefined,
        or(
          gte(products.stock, 1),
          and(eq(products.status, 'SOLD'), gte(products.updatedAt, fiveMinutesAgo))
        )
      )
    )
    .orderBy(orderByClause);

  return await query;
}

export async function getProductBySlug(slugOrId: string) {
  const result = await db
    .select()
    .from(products)
    .leftJoin(productImages, eq(products.id, productImages.productId))
    .where(or(eq(products.slug, slugOrId), eq(products.id, slugOrId)))
    .orderBy(sql`${productImages.isMain} DESC`, sql`${productImages.id} ASC`);

  const [firstRow] = result;
  if (!firstRow) return null;

  const images = Array.from(
    new Set(
      result
        .map(r => r.product_images?.url)
        .filter((url): url is string => Boolean(url))
    )
  );

  return { ...firstRow.products, images };
}