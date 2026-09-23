'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';

interface AddToCartButtonProps {
  product: {
    id: string;
    title: string;
    price: number | string;
    size: string;
    imageUrl?: string | null;
    slug: string;
    stock: number;
  };
  isSold: boolean;
}

export function AddToCartButton({ product, isSold }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (isSold) {
    return (
      <div className="w-full bg-neutral-200 text-neutral-500 font-bold py-3.5 rounded-2xl text-center text-sm cursor-not-allowed">
        Peça Vendida ❌
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {product.stock > 1 && (
        <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-2xl p-3">
          <label htmlFor={`quantity-${product.id}`} className="text-xs font-semibold text-neutral-600">
            Quantidade
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="w-8 h-8 rounded-lg bg-white border border-neutral-200 font-bold" aria-label="Diminuir quantidade">−</button>
            <input
              id={`quantity-${product.id}`}
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(event) => setQuantity(Math.min(product.stock, Math.max(1, Number(event.target.value) || 1)))}
              className="w-14 h-8 text-center rounded-lg border border-neutral-200 text-sm"
            />
            <button type="button" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} className="w-8 h-8 rounded-lg bg-white border border-neutral-200 font-bold" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
      )}
      <button
      type="button"
      onClick={() =>
        addToCart({
          id: product.id,
          title: product.title,
          price: Number(product.price),
          size: product.size,
          imageUrl: product.imageUrl || undefined,
          slug: product.slug, // Obrigatório para o tipo CartItem
          stock: product.stock,
          quantity,
        })
      }
      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-pink-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
    >
      <span>Adicionar à Sacola</span>
      <span className="text-base">🛍️</span>
      </button>
      <p className="text-center text-[11px] text-neutral-500">
        O item será reservado após finalizar a sacola com seus dados.
      </p>
    </div>
  );
}
