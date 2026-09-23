'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { reserveProductsAction } from '../app/admin/actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function CartDrawer() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart, isCartOpen, setIsCartOpen, totalPrice } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isCartOpen) return null;

  const handleWhatsAppCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage("Por favor, preencha seu Nome e WhatsApp para finalizar a reserva.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const items = cart.map((item) => ({ productId: item.id, quantity: item.quantity }));
      await reserveProductsAction(items, customerName, customerPhone);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir a reserva. Tente novamente.");
      setIsSubmitting(false);
      return;
    }

    const phoneNumber = "5547996473275"; // Número do WhatsApp da Mila
    
    let message = `Olá Mila! Meu nome é *${customerName}* (WhatsApp: ${customerPhone}). Gostaria de reservar os seguintes garimpos:\n\n`;
    
    cart.forEach((item, index) => {
      const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price);
      const formattedSubtotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity);
      message += `${index + 1}. *${item.title}*\n`;
      message += `   • Tamanho: ${item.size}\n`;
      message += `   • Quantidade: ${item.quantity}\n`;
      message += `   • Valor unitário: ${formattedPrice}\n`;
      message += `   • Subtotal: ${formattedSubtotal}\n`;
      if (item.imageUrl) {
        message += `   • Foto: ${item.imageUrl}\n`;
      }
      message += `\n`;
    });

    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice);
    message += `💰 *Total da Sacola:* ${formattedTotal}\n\n`;
    message += "Como procedemos com o pagamento e envio?";

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');

    // Limpa a sacola e fecha o painel lateral automaticamente após enviar
    clearCart();
    setIsCartOpen(false);
    setIsSubmitting(false);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      {/* Overlay escuro */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-[calc(100vw-1rem)] sm:w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Cabeçalho da Sacola */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
            <h2 id="cart-title" className="text-base font-bold text-neutral-900">
              🛍️ Sua Sacola de Garimpos ({cart.reduce((total, item) => total + item.quantity, 0)})
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              aria-label="Fechar sacola"
              className="text-neutral-400 hover:text-neutral-700 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Lista de Itens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <span className="text-4xl">🛒</span>
                <p className="text-sm font-bold text-neutral-800">Sua sacola está vazia</p>
                <p className="text-xs text-neutral-500">Escolha alguns garimpos incríveis na vitrine para começar!</p>
              </div>
            ) : (
              cart.map((item) => {
                const formattedItemPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price || 0) * item.quantity);
                
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 bg-neutral-50 border border-neutral-200/80 p-3 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-neutral-200 rounded-xl overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400">Sem foto</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-neutral-900 text-xs line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Tam: <strong className="text-pink-600">{item.size}</strong></p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Diminuir quantidade de ${item.title}`}
                            className="w-6 h-6 rounded-md border border-neutral-300 bg-white text-neutral-700 font-bold disabled:opacity-40"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(event) => updateQuantity(item.id, Number(event.target.value) || 1)}
                            aria-label={`Quantidade de ${item.title}`}
                            className="w-11 h-6 rounded-md border border-neutral-300 bg-white text-center text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            aria-label={`Aumentar quantidade de ${item.title}`}
                            className="w-6 h-6 rounded-md border border-neutral-300 bg-white text-neutral-700 font-bold disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1">Disponíveis: {item.stock}</p>
                        <p className="text-xs font-black text-neutral-900 mt-1">Subtotal: {formattedItemPrice}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-neutral-400 hover:text-red-600 p-2 transition-colors cursor-pointer"
                      title="Remover item"
                      aria-label={`Remover uma unidade de ${item.title}`}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Identificação e Checkout */}
          {cart.length > 0 && (
            <form onSubmit={handleWhatsAppCheckout} className="border-t border-neutral-200 p-6 space-y-4 bg-neutral-50/50">
              
              {/* Campos de Identificação da Cliente */}
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-neutral-700 uppercase tracking-wide">Seus Dados para Reserva:</p>
                </div>
                <div>
                  <label htmlFor="customer-name" className="sr-only">Nome completo</label>
                  <input
                    id="customer-name"
                    type="text"
                    required
                    placeholder="Seu Nome Completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:border-pink-600 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="customer-phone" className="sr-only">WhatsApp com DDD</label>
                  <input
                    id="customer-phone"
                    type="text"
                    inputMode="tel"
                    required
                    placeholder="Seu WhatsApp (com DDD)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:border-pink-600 outline-none"
                  />
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total dos Garimpos:</span>
                <span className="text-lg font-black text-pink-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-emerald-600/20 text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Registrando...' : 'Finalizar Reserva via WhatsApp'}</span>
                <span className="text-base">💬</span>
              </button>
              <p className="text-center text-[10px] text-neutral-500">
                A reserva é confirmada ao concluir esta etapa.
              </p>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/"
                  onClick={() => setIsCartOpen(false)}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
                >
                  ← Continuar Comprando
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                >
                  Esvaziar sacola
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
