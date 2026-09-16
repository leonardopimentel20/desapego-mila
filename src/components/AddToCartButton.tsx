'use client';

import { useCart } from '../context/CartContext';

interface AddToCartButtonProps {
  product: {
    id: string;
    title: string;
    price: number | string;
    size: string;
    imageUrl?: string | null;
    slug: string;
  };
  isSold: boolean;
}

export function AddToCartButton({ product, isSold }: AddToCartButtonProps) {
  const { addToCart } = useCart();

  if (isSold) {
    return (
      <div className="w-full bg-neutral-200 text-neutral-500 font-bold py-3.5 rounded-2xl text-center text-sm cursor-not-allowed">
        Peça Vendida ❌
      </div>
    );
  }

  return (
    <button
      onClick={() =>
        addToCart({
          id: product.id,
          title: product.title,
          price: Number(product.price),
          size: product.size,
          imageUrl: product.imageUrl || undefined,
          slug: product.slug, // Obrigatório para o tipo CartItem
        })
      }
      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-pink-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
    >
      <span>Adicionar à Sacola</span>
      <span className="text-base">🛍️</span>
    </button>
  );
}