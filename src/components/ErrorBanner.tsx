'use client';

import { useEffect, useState } from 'react';

export function ErrorBanner({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url.toString());
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-start justify-between gap-3 shadow-xs"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="text-base leading-none">⚠️</span>
        <div>
          <span className="font-bold block mb-0.5">Não foi possível concluir</span>
          <span>{message}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar mensagem de erro"
        className="text-rose-400 hover:text-rose-700 text-sm font-bold cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
