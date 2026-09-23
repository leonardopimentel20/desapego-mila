"use client";

export function PrintDeliveryLabel() {
  return (
    <button type="button" onClick={() => window.print()}
      className="rounded-xl bg-pink-600 px-4 py-2 font-bold text-white print:hidden">
      Imprimir etiqueta
    </button>
  );
}
