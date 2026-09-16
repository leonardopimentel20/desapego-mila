import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  price: z.number().positive("O preço deve ser maior que zero."),
  stock: z.number().int().min(0, "O estoque não pode ser negativo."),
  categoryId: z.string(),
  size: z.string(),
});