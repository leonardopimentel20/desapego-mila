import { z } from 'zod';

export const productSchema = z.object({
  title: z.string()
    .min(3, { message: "O título da peça deve ter pelo menos 3 caracteres." })
    .max(100, { message: "O título da peça está muito longo (máximo de 100 caracteres)." }),
  
  description: z.string()
    .max(500, { message: "A descrição não pode passar de 500 caracteres." })
    .optional()
    .nullable(),
  
  price: z.number()
    .positive({ message: "O preço deve ser maior que zero." })
    .max(10000, { message: "O preço informado parece alto demais para um brechó (limite de R$ 10.000,00)." }),
  
  stock: z.number()
    .int({ message: "O estoque deve ser um número inteiro." })
    .min(0, { message: "O estoque não pode ser negativo." })
    .max(999, { message: "Quantidade de estoque muito alta (limite de 999 unidades)." }),
  
  categoryId: z.string().min(1, { message: "Selecione uma categoria principal válida." }),
  
  size: z.string().min(1, { message: "Selecione um tamanho ou numeração válida." }),
});