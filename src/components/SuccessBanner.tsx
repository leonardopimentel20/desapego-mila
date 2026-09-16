'use client';

import { useEffect, useState } from 'react';

export function SuccessBanner({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('photoSuccess');
    window.history.replaceState({}, '', url.toString());

    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        className="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer ml-3"
      >
        ✕
      </button>
    </div>
  );
}