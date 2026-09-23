'use client';

import { useState } from 'react';

interface DeleteButtonProps {
  productId: string;
  deleteAction: (id: string) => Promise<void>;
}

export function DeleteButton({ productId, deleteAction }: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage('');
          setIsOpen(true);
        }}
        className="text-xs bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-all cursor-pointer font-semibold"
      >
        Excluir
      </button>

      {/* Modal Personalizado */}
      {isOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 id="delete-dialog-title" className="text-base font-extrabold text-neutral-900">Excluir Garimpo 🗑️</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Tem certeza que deseja excluir este item da vitrine? Esta ação não pode ser desfeita.
              </p>
            </div>
            {errorMessage && (
              <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-semibold">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await deleteAction(productId);
                  } catch (error) {
                    setLoading(false);
                    setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir o produto.');
                  }
                }}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {loading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
