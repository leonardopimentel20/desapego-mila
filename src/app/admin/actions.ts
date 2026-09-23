'use server';

import { db } from "../../db";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { products, productImages, reservations, reservationItems } from "../../db/schema";
import { productSchema } from "../../db/validator";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "../../lib/admin-auth";

const idSchema = z.string().uuid();
const reservationSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
  })).min(1).max(20),
  customerName: z.string().trim().min(2).max(255),
  customerPhone: z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/),
});

const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseId(value: string) {
  const result = idSchema.safeParse(value);
  if (!result.success) throw new Error("Identificador inválido.");
  return result.data;
}

function getProductData(formData: FormData) {
  const priceInput = String(formData.get("price") || "").trim();
  const sanitizedPrice = parsePrice(priceInput);
  const stockInput = String(formData.get("stock") || "").trim();

  const validation = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    price: sanitizedPrice,
    stock: stockInput === "" ? NaN : Number(stockInput),
    categoryId: formData.get("categoryId"),
    size: formData.get("size"),
    subcategory: formData.get("subcategory") || "geral",
    gender: formData.get("gender") || "feminino",
  });

  if (!validation.success) throw new Error(validation.error.issues[0].message);
  return validation.data;
}

function parsePrice(value: string) {
  if (!value) return NaN;

  // PriceInput submits a canonical decimal value (e.g. "454.54").
  if (/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return Number(value);
  }

  const normalized = value.replace(/[^\d,.]/g, "");
  if (!normalized) return NaN;

  if (normalized.includes(",")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."));
  }

  return Number(normalized);
}

function createSlug(title: string, productId: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return `${slug}-${productId.slice(0, 5)}`;
}

function requireCloudinaryConfig() {
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("O serviço de imagens não está configurado.");
  }
}

async function uploadImage(buffer: Buffer, mimeType: string) {
  requireCloudinaryConfig();
  if (!ALLOWED_IMAGE_TYPES.has(mimeType) || buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
    throw new Error("Cada foto deve ser JPG, PNG ou WebP e ter no máximo 10 MB.");
  }

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "desapego-mila", resource_type: "image" },
      (error, result) => {
        if (error || !result) reject(new Error("Não foi possível enviar a foto."));
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function deleteProductImageAction(imageId: string, productId: string): Promise<void> {
  await requireAdminSession();
  const validImageId = parseId(imageId);
  const validProductId = parseId(productId);

  await db.transaction(async (tx) => {
    const [image] = await tx.select().from(productImages).where(
      and(eq(productImages.id, validImageId), eq(productImages.productId, validProductId))
    );
    if (!image) throw new Error("Foto não encontrada.");

    await tx.delete(productImages).where(eq(productImages.id, validImageId));

    if (image.isMain === 1) {
      const [replacement] = await tx.select().from(productImages)
        .where(eq(productImages.productId, validProductId)).limit(1);
      if (replacement) {
        await tx.update(productImages).set({ isMain: 1 }).where(eq(productImages.id, replacement.id));
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/edit/${productId}`);
}

export async function setMainImageAction(imageId: string, productId: string): Promise<void> {
  await requireAdminSession();
  const validImageId = parseId(imageId);
  const validProductId = parseId(productId);

  await db.transaction(async (tx) => {
    const [image] = await tx.select({ id: productImages.id }).from(productImages).where(
      and(eq(productImages.id, validImageId), eq(productImages.productId, validProductId))
    );
    if (!image) throw new Error("Foto não encontrada.");

    await tx.update(productImages).set({ isMain: 0 }).where(eq(productImages.productId, validProductId));
    await tx.update(productImages).set({ isMain: 1 }).where(eq(productImages.id, validImageId));
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/edit/${productId}`);
}

export async function setProductStatusAction(
  productId: string,
  targetStatus: 'AVAILABLE' | 'SOLD'
): Promise<void> {
  await requireAdminSession();
  const validProductId = parseId(productId);

  await db.transaction(async (tx) => {
    const [product] = await tx.select({
      status: products.status,
      stock: products.stock,
      reservedQuantity: products.reservedQuantity,
    }).from(products)
      .where(eq(products.id, validProductId)).for("update");
    if (!product) throw new Error("Produto não encontrado.");
    if (targetStatus === "SOLD" && product.reservedQuantity > 0) {
      throw new Error("Finalize ou cancele as reservas antes de marcar este produto como vendido.");
    }

    await tx.update(products)
      .set({
        status: targetStatus,
        // A mudança manual de status não representa uma baixa de estoque.
        // O estoque só é decrementado por registerSaleAction.
        stock: targetStatus === 'AVAILABLE' ? Math.max(product.stock, 1) : product.stock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, validProductId));
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  await requireAdminSession();
  const validProductId = parseId(productId);
  const { title, description, price, stock, categoryId, size, subcategory, gender } = getProductData(formData);
  const [existingProduct] = await db.select({
    id: products.id,
    status: products.status,
    reservedQuantity: products.reservedQuantity,
  }).from(products).where(eq(products.id, validProductId));
  if (!existingProduct) throw new Error("Produto não encontrado.");
  if (existingProduct.status === "RESERVED" && stock < existingProduct.reservedQuantity) {
    throw new Error(`O estoque não pode ser menor que as ${existingProduct.reservedQuantity} unidades reservadas.`);
  }

  const imageFiles = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
  if (imageFiles.length > MAX_IMAGES) throw new Error(`Envie no máximo ${MAX_IMAGES} fotos por vez.`);
  const uploadedUrls: string[] = [];
  for (const imageFile of imageFiles) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    uploadedUrls.push(await uploadImage(buffer, imageFile.type));
  }

  await db.transaction(async (tx) => {
    await tx.update(products)
      .set({
        title,
        slug: createSlug(title, validProductId),
        description: description || null,
        price: price.toString(),
        stock,
        categoryId,
        subcategory,
        gender,
        size,
        updatedAt: new Date(),
      })
      .where(eq(products.id, validProductId));

    if (uploadedUrls.length > 0) {
      await tx.insert(productImages).values(uploadedUrls.map((url) => ({
        id: randomUUID(),
        url,
        isMain: 0,
        productId: validProductId,
      })));
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=atualizado");
}

// Registra uma venda manual usando somente uma unidade disponível.
export async function registerSaleAction(productId: string): Promise<void> {
  await requireAdminSession();
  const validProductId = parseId(productId);

  await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products)
      .where(eq(products.id, validProductId)).for("update");
    if (!product) throw new Error("Produto não encontrado.");
    if (product.stock <= 0) throw new Error("Este produto já está sem estoque.");

    const newStock = product.stock - 1;
    await tx.update(products)
      .set({
        stock: newStock,
        soldQuantity: product.soldQuantity + 1,
        status: newStock === 0 ? 'SOLD' : 'AVAILABLE',
        ...(product.reservedQuantity === 0 ? {
          customerName: null,
          customerPhone: null,
        } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, validProductId));
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteProductAction(productId: string): Promise<void> {
  await requireAdminSession();
  const validProductId = parseId(productId);
  await db.transaction(async (tx) => {
    await tx.delete(productImages).where(eq(productImages.productId, validProductId));
    await tx.delete(products).where(eq(products.id, validProductId));
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=excluido");
}

export async function createProductAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const { title, description, price, stock, categoryId, size, subcategory, gender } = getProductData(formData);

  const productId = randomUUID();
  const imageBase64s = formData.getAll("imagesBase64") as string[];
  const uploadedUrls: string[] = [];

  if (imageBase64s.length > MAX_IMAGES) throw new Error(`Envie no máximo ${MAX_IMAGES} fotos.`);

  if (imageBase64s && imageBase64s.length > 0) {
    try {
      for (const base64Str of imageBase64s) {
        if (!base64Str || typeof base64Str !== "string") continue;

        const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(base64Str);
        if (!match) throw new Error("Formato de foto inválido.");

        const [, mimeType, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");

        uploadedUrls.push(await uploadImage(buffer, mimeType));
      }
    } catch (uploadError: unknown) {
      if (uploadError instanceof Error) throw uploadError;
      throw new Error("Não foi possível enviar as fotos.");
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: productId,
      title,
      slug: createSlug(title, productId),
      description: description || null,
      price: price.toString(),
      stock,
      categoryId,
      subcategory,
      gender,
      size,
      status: stock === 0 ? "SOLD" : "AVAILABLE",
    });

    if (uploadedUrls.length > 0) {
      await tx.insert(productImages).values(uploadedUrls.map((url, index) => ({
        id: randomUUID(),
        url,
        isMain: index === 0 ? 1 : 0,
        productId,
      })));
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=cadastrado");
}
export async function reserveProductsAction(
  items: Array<{ productId: string; quantity: number }>,
  customerName?: string,
  customerPhone?: string
): Promise<string> {
  const validation = reservationSchema.safeParse({
    items,
    customerName,
    customerPhone,
  });
  if (!validation.success) throw new Error("Confira seu nome, WhatsApp e os itens da sacola.");

  const { items: validItems, customerName: name, customerPhone: phone } = validation.data;
  const validIds = validItems.map((item) => item.productId);
  if (new Set(validIds).size !== validIds.length) {
    throw new Error("A sacola contém itens duplicados. Atualize a página e tente novamente.");
  }
  const quantitiesById = new Map(validItems.map((item) => [item.productId, item.quantity]));
  const reservationId = randomUUID();

  await db.transaction(async (tx) => {
    const selectedProducts = await tx.select({
      id: products.id,
      status: products.status,
      stock: products.stock,
      reservedQuantity: products.reservedQuantity,
    }).from(products).where(inArray(products.id, validIds)).for("update");

    if (
      selectedProducts.length !== validIds.length ||
      selectedProducts.some((product) => {
        const requestedQuantity = quantitiesById.get(product.id) ?? 0;
        return product.status !== "AVAILABLE" || product.stock < requestedQuantity;
      })
    ) {
      throw new Error("Um ou mais itens não possuem a quantidade solicitada. Atualize a vitrine e tente novamente.");
    }

    await tx.insert(reservations).values({
      id: reservationId,
      status: "PENDING",
      customerName: name,
      customerPhone: phone,
    });
    await tx.insert(reservationItems).values(validItems.map((item) => ({
      id: randomUUID(),
      reservationId,
      productId: item.productId,
      quantity: item.quantity,
    })));

    for (const item of validItems) {
      const product = selectedProducts.find((entry) => entry.id === item.productId);
      if (!product) throw new Error("Um produto da reserva não foi encontrado.");

      await tx.update(products)
        .set({
          stock: product.stock - item.quantity,
          status: 'AVAILABLE',
          reservedQuantity: product.reservedQuantity + item.quantity,
          ...(product.reservedQuantity === 0 ? {
            customerName: name,
            customerPhone: phone,
          } : {}),
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return reservationId;
}

export async function confirmReservationAction(reservationId: string): Promise<void> {
  await requireAdminSession();
  const validReservationId = parseId(reservationId);
  await db.transaction(async (tx) => {
    const [reservation] = await tx.select({ status: reservations.status })
      .from(reservations).where(eq(reservations.id, validReservationId)).for("update");
    if (!reservation) throw new Error("Reserva não encontrada.");
    if (reservation.status !== "PENDING") throw new Error("Somente reservas pendentes podem ser confirmadas.");
    const items = await tx.select({
      productId: reservationItems.productId,
      quantity: reservationItems.quantity,
    })
      .from(reservationItems).where(eq(reservationItems.reservationId, validReservationId));
    if (items.length === 0) throw new Error("A reserva não possui itens.");

    for (const item of items) {
      const [product] = await tx.select({
        stock: products.stock,
        status: products.status,
        reservedQuantity: products.reservedQuantity,
        soldQuantity: products.soldQuantity,
      }).from(products).where(eq(products.id, item.productId)).for("update");

      if (!product) throw new Error("Um produto da reserva não foi encontrado.");
      if (product.status === "SOLD" || product.reservedQuantity < item.quantity) {
        throw new Error("Um produto da reserva não está mais disponível para concluir a venda.");
      }

      await tx.update(products).set({
        soldQuantity: product.soldQuantity + item.quantity,
        status: product.stock === 0 && product.reservedQuantity === item.quantity ? "SOLD" : "AVAILABLE",
        reservedQuantity: product.reservedQuantity - item.quantity,
        ...(product.reservedQuantity === item.quantity ? {
          customerName: null,
          customerPhone: null,
        } : {}),
        updatedAt: new Date(),
      }).where(eq(products.id, item.productId));
    }

    await tx.update(reservations).set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(eq(reservations.id, validReservationId));
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function cancelReservationAction(reservationId: string): Promise<void> {
  await requireAdminSession();
  const validReservationId = parseId(reservationId);
  await db.transaction(async (tx) => {
    const [reservation] = await tx.select({ status: reservations.status })
      .from(reservations).where(eq(reservations.id, validReservationId)).for("update");
    if (!reservation) throw new Error("Reserva não encontrada.");
    if (reservation.status === "CANCELLED") return;
    if (reservation.status !== "PENDING") {
      throw new Error("Uma reserva confirmada já foi registrada como venda e não pode ser cancelada por aqui.");
    }
    const items = await tx.select({
      productId: reservationItems.productId,
      quantity: reservationItems.quantity,
    })
      .from(reservationItems).where(eq(reservationItems.reservationId, validReservationId));
    for (const item of items) {
      const [product] = await tx.select({
        stock: products.stock,
        status: products.status,
        reservedQuantity: products.reservedQuantity,
      }).from(products)
        .where(eq(products.id, item.productId)).for("update");
      if (product) {
        await tx.update(products).set({
          stock: product.stock + item.quantity,
          status: "AVAILABLE",
          reservedQuantity: Math.max(0, product.reservedQuantity - item.quantity),
          ...(product.reservedQuantity <= item.quantity ? {
            customerName: null,
            customerPhone: null,
          } : {}),
          updatedAt: new Date(),
        }).where(eq(products.id, item.productId));
      }
    }
    await tx.update(reservations).set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(reservations.id, validReservationId));
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function removeReservationItemAction(reservationItemId: string): Promise<void> {
  await requireAdminSession();
  const validItemId = parseId(reservationItemId);
  await db.transaction(async (tx) => {
    const [item] = await tx.select({
      id: reservationItems.id,
      reservationId: reservationItems.reservationId,
      productId: reservationItems.productId,
      quantity: reservationItems.quantity,
      status: reservations.status,
    }).from(reservationItems)
      .innerJoin(reservations, eq(reservations.id, reservationItems.reservationId))
      .where(eq(reservationItems.id, validItemId)).for("update");
    if (!item) throw new Error("Item da reserva não encontrado.");
    if (item.status !== "PENDING") {
      throw new Error("Os itens só podem ser ajustados enquanto a reserva estiver pendente.");
    }
    const [product] = await tx.select({
      stock: products.stock,
      status: products.status,
      reservedQuantity: products.reservedQuantity,
    }).from(products)
      .where(eq(products.id, item.productId)).for("update");
    if (product) {
      if (item.quantity > 1) {
        await tx.update(products).set({
          stock: product.stock + 1,
          status: "AVAILABLE",
          reservedQuantity: Math.max(0, product.reservedQuantity - 1),
          ...(product.reservedQuantity <= 1 ? {
            customerName: null,
            customerPhone: null,
          } : {}),
          updatedAt: new Date(),
        }).where(eq(products.id, item.productId));
      } else {
        await tx.update(products).set({
          stock: product.stock + 1,
          status: "AVAILABLE",
          reservedQuantity: Math.max(0, product.reservedQuantity - 1),
          ...(product.reservedQuantity <= 1 ? {
            customerName: null,
            customerPhone: null,
          } : {}),
          updatedAt: new Date(),
        }).where(eq(products.id, item.productId));
      }
    }
    const remaining = await tx.select({ id: reservationItems.id }).from(reservationItems)
      .where(eq(reservationItems.reservationId, item.reservationId));
    if (item.quantity > 1) {
      await tx.update(reservationItems).set({ quantity: item.quantity - 1 })
        .where(eq(reservationItems.id, validItemId));
    } else {
      await tx.delete(reservationItems).where(eq(reservationItems.id, validItemId));
    }
    if (remaining.length <= 1 && item.quantity <= 1) {
      await tx.update(reservations).set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(reservations.id, item.reservationId));
    }
  });
  revalidatePath("/");
  revalidatePath("/admin");
}
