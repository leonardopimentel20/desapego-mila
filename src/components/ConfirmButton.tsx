'use client';

import { ReactNode, useRef, useState } from 'react';

interface ConfirmButtonProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  className?: string;
  children: ReactNode;
}

export function ConfirmButton({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  className,
  children,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const isDanger = variant === 'danger';

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          formRef.current = e.currentTarget.closest('form');
          setOpen(true);
        }}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-neutral-200/80 space-y-4"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${
              isDanger ? 'bg-red-50 text-red-600 border-red-100' : 'bg-pink-50 text-pink-600 border-pink-100'
            }`}>
              {isDanger ? '🗑️' : '✅'}
            </div>

            <div>
              <h3 id="confirm-dialog-title" className="text-sm font-black text-neutral-900 mb-1">
                {title || (isDanger ? 'Confirmar exclusão' : 'Confirmar ação')}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{message}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 py-3 rounded-xl transition-all cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  formRef.current?.requestSubmit();
                }}
                className={`flex-1 text-xs font-bold text-white py-3 rounded-xl transition-all cursor-pointer shadow-md ${
                  isDanger ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
