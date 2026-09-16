import { loginAction } from "./actions";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-neutral-200/80 rounded-3xl p-8 space-y-6 shadow-xs">
        
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-pink-600 tracking-tight">
            Desapego da Mila
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Área restrita exclusiva para a administração.
          </p>
        </div>

        {error === 'senha_incorreta' && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-2xl text-center font-semibold">
            ❌ Senha incorreta. Tente novamente.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Senha de Acesso
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Digite sua senha administrativa"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-neutral-900 focus:outline-pink-600 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-pink-600/20 text-sm cursor-pointer"
          >
            Entrar no Painel 🔒
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-neutral-500 hover:text-pink-600 transition-colors font-medium">
            ← Voltar para a Vitrine Pública
          </Link>
        </div>

      </div>
    </main>
  );
}