import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 text-center shadow-sm space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-2xl" aria-hidden="true">
          🛍️
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black text-neutral-900">Este garimpo não está mais disponível</h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            O produto pode ter sido vendido ou removido. Volte para a vitrine para conferir as peças disponíveis agora.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-5 rounded-2xl transition-colors"
        >
          Voltar para a vitrine
        </Link>
      </div>
    </main>
  );
}
