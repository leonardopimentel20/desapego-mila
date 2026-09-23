'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  size: string;
  imageUrl?: string;
  slug: string;
  stock: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'desapego_mila_cart_v4';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carrega do localStorage ao iniciar
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          // A leitura precisa ocorrer após a hidratação para manter servidor e cliente consistentes.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCart(parsed);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar sacola", e);
    }
    setIsInitialized(true);
  }, []);

  // Salva no localStorage sempre que mudar
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (e) {
        console.error("Erro ao salvar sacola", e);
      }
    }
  }, [cart, isInitialized]);

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // Evita duplicar o mesmo item exato
      if (prevCart.some((i) => i.id === item.id)) {
        return prevCart;
      }
      return [...prevCart, item];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.flatMap((item) => {
      if (item.id !== id) return [item];
      if (item.quantity > 1) return [{ ...item, quantity: item.quantity - 1 }];
      return [];
    }));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prevCart) => prevCart.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // O carrinho em memória continua funcional se o armazenamento estiver indisponível.
    }
  };

  const totalPrice = cart.reduce((acc, item) => acc + Number(item.price || 0) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
}
