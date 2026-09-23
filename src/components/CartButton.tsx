'use client';

import { useCart } from '../context/CartContext';

export function CartButton() {
  const { cart, setIsCartOpen } = useCart();

  return (
    <button
      type="button"
      onClick={() => setIsCartOpen(true)}
      className="relative bg-white border border-neutral-200 hover:border-pink-400 text-neutral-800 px-4 py-2.5 rounded-full font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
    >
      <span>🛍️ Sacola</span>
      {cart.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-pink-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
          {cart.length}
        </span>
      )}
    </button>
  );
}