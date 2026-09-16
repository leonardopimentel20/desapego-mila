'use server';

import { db } from "../../db";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { products, productImages } from "../../db/schema";
import { productSchema } from "../../db/validator";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function deleteProductImageAction(imageId: string, productId: string): Promise<void> {
  await db.delete(productImages).where(eq(productImages.id, imageId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/edit/${productId}`);
}

export async function setMainImageAction(imageId: string, productId: string): Promise<void> {
  await db.update(productImages)
    .set({ isMain: 0 })
    .where(eq(productImages.productId, productId));

  await db.update(productImages)
    .set({ isMain: 1 })
    .where(eq(productImages.id, imageId));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/edit/${productId}`);
}

export async function toggleProductStatusAction(productId: string, currentStatus: string): Promise<void> {
  const newStatus = currentStatus === 'AVAILABLE' ? 'SOLD' : 'AVAILABLE';
  const newStock = newStatus === 'AVAILABLE' ? 1 : 0;

  await db.update(products)
    .set({
      status: newStatus,
      stock: newStock,
      customerName: null,
      customerPhone: null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const priceInput = String(formData.get("price") || "").trim();
  const sanitizedPrice = priceInput.replace(/[^\d,]/g, "").replace(",", ".");
  const stockInput = String(formData.get("stock") || "").trim();

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") || "",
    price: sanitizedPrice === "" ? NaN : Number(sanitizedPrice),
    stock: stockInput === "" ? NaN : Number(stockInput),
    categoryId: formData.get("categoryId") || "roupas",
    size: formData.get("size") || "M",
  };

  const validation = productSchema.safeParse(rawData);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  const { title, description, price, stock, categoryId, size } = validation.data;
  const subcategory = String(formData.get("subcategory") || "geral");
  const gender = String(formData.get("gender") || "feminino");

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  await db.update(products)
    .set({
      title,
      slug: `${slug}-${productId.slice(0, 5)}`,
      description: description || null,
      price: price.toString(),
      stock,
      categoryId,
      subcategory,
      gender,
      size,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  const imageFiles = formData.getAll("images");
  if (imageFiles && imageFiles.length > 0) {
    for (const imageFile of imageFiles) {
      if (imageFile instanceof File && imageFile.size > 0) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const imageUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "desapego-mila" },
            (error, result) => {
              if (error) reject(error);
              else if (result) resolve(result.secure_url);
              else reject(new Error("Nenhum retorno recebido do Cloudinary."));
            }
          );
          uploadStream.end(buffer);
        });

        await db.insert(productImages).values({
          id: randomUUID(),
          url: imageUrl,
          isMain: 0,
          productId,
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=atualizado");
}

// Registrar Venda de forma gradativa para múltiplos estoques
export async function registerSaleAction(productId: string): Promise<void> {
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  
  if (!product) return;

  const currentStock = Number(product.stock) || 0;
  const newStock = Math.max(0, currentStock - 1);

  if (newStock > 0) {
    // Se ainda há estoque restante (ex: de 10 vai para 9), diminui 1, 
    // limpa os dados da cliente e mantém o produto disponível na vitrine.
    await db.update(products)
      .set({
        stock: newStock,
        status: 'AVAILABLE',
        customerName: null,
        customerPhone: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  } else {
    // Se chegou a 0 (última unidade), zera o estoque e marca como Vendido (SOLD)
    await db.update(products)
      .set({
        stock: 0,
        status: 'SOLD',
        customerName: null,
        customerPhone: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteProductAction(productId: string): Promise<void> {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=excluido");
}

export async function createProductAction(formData: FormData): Promise<void> {
  const priceInput = String(formData.get("price") || "").trim();
  const sanitizedPrice = priceInput.replace(/[^\d,]/g, "").replace(",", ".");
  const stockInput = String(formData.get("stock") || "").trim();

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") || "",
    price: sanitizedPrice === "" ? NaN : Number(sanitizedPrice),
    stock: stockInput === "" ? NaN : Number(stockInput),
    categoryId: formData.get("categoryId") || "roupas",
    size: formData.get("size") || "M",
  };

  const validation = productSchema.safeParse(rawData);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  const { title, description, price, stock, categoryId, size } = validation.data;
  const subcategory = String(formData.get("subcategory") || "geral");
  const gender = String(formData.get("gender") || "feminino");

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  const productId = randomUUID();
  const imageBase64s = formData.getAll("imagesBase64") as string[];
  const uploadedUrls: string[] = [];

  if (imageBase64s && imageBase64s.length > 0) {
    try {
      for (const base64Str of imageBase64s) {
        if (!base64Str || typeof base64Str !== "string") continue;

        // Extrai os dados do Base64 após a vírgula de forma limpa
        const commaIndex = base64Str.indexOf(",");
        if (commaIndex === -1) continue;
        
        const base64Data = base64Str.slice(commaIndex + 1);
        const buffer = Buffer.from(base64Data, "base64");

        if (buffer.length === 0) continue;

        const imageUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "desapego-mila" },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve(result.secure_url);
              } else {
                reject(new Error("Nenhum retorno recebido do Cloudinary."));
              }
            }
          );
          uploadStream.end(buffer);
        });

        uploadedUrls.push(imageUrl);
      }
    } catch (uploadError: any) {
      const errorMsg = uploadError?.message || String(uploadError);
      throw new Error(`Erro do Cloudinary: ${errorMsg}`);
    }
  }

  await db.insert(products).values({
    id: productId,
    title,
    slug: `${slug}-${productId.slice(0, 5)}`,
    description: description || null,
    price: price.toString(),
    stock,
    categoryId,
    subcategory,
    gender,
    size,
    status: "AVAILABLE",
  });

  for (let i = 0; i < uploadedUrls.length; i++) {
    await db.insert(productImages).values({
      id: randomUUID(),
      url: uploadedUrls[i],
      isMain: i === 0 ? 1 : 0,
      productId,
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=cadastrado");
}
export async function reserveProductsAction(
  productIds: string[],
  customerName?: string,
  customerPhone?: string
): Promise<void> {
  if (!productIds || productIds.length === 0) return;

  for (const id of productIds) {
    await db.update(products)
      .set({
        status: 'RESERVED',
        customerName: customerName ? customerName.trim() : "Cliente do WhatsApp",
        customerPhone: customerPhone ? customerPhone.trim() : "",
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
  }

  revalidatePath("/");
  revalidatePath("/admin");
}