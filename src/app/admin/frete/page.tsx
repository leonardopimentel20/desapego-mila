import Link from "next/link";
import { requireAdminSession } from "../../../lib/admin-auth";
import { getShippingSettings } from "../../../shipping/store";
import { saveShippingSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireAdminSession();
  const settings = await getShippingSettings();
  const params = await searchParams;
  const inputClass = "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200";
  const money = (cents: number | null) => cents === null ? "" : (cents / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-[#F9F8F6] p-4 text-neutral-900 md:p-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/admin" className="text-sm font-bold text-pink-700">← Voltar ao painel</Link>
        <header>
          <h1 className="text-2xl font-extrabold text-pink-600">Frete por distância</h1>
          <p className="mt-2 text-sm text-neutral-600">Entregas em Joinville/SC, com trajeto de motocicleta calculado pelo Geoapify.</p>
        </header>
        <p className="rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm font-semibold">
          {settings.enabled ? "Ativo: o cliente recebe a cotação após informar o endereço completo." : "Desativado: permanece a taxa fixa atual de R$ 30,00."}
        </p>
        {params.success && <p role="status" className="rounded-xl bg-emerald-100 p-4 text-emerald-900">Configurações salvas. Novas cotações usarão estes valores.</p>}
        {params.error && <p role="alert" className="rounded-xl bg-rose-100 p-4 text-rose-900">{params.error.slice(0, 300)}</p>}
        {!process.env.GEOAPIFY_API_KEY?.trim() && <p role="alert" className="rounded-xl bg-amber-100 p-4 text-sm text-amber-950">A chave Geoapify ainda precisa ser configurada no servidor do site e do WhatsApp.</p>}
        <form action={saveShippingSettingsAction} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-5 w-5 accent-pink-600" />
            Ativar cálculo por distância
          </label>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-bold">Endereço de saída • Joinville/SC</legend>
            <label className="block text-sm font-semibold">Rua ou avenida
              <input name="originStreet" maxLength={255} defaultValue={settings.originStreet} className={inputClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Número
                <input name="originNumber" maxLength={30} defaultValue={settings.originNumber} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold">Bairro
                <input name="originNeighborhood" maxLength={120} defaultValue={settings.originNeighborhood} className={inputClass} />
              </label>
            </div>
            <details className="rounded-xl border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-bold">Localização exata da saída (opcional)</summary>
              <p className="mt-2 text-xs text-neutral-600">Se o mapa não encontrar o imóvel, informe latitude e longitude do ponto exato. No Google Maps, clique com o botão direito no ponto e copie as coordenadas. Ao mudar o endereço, atualize ou limpe ambos os campos.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">Latitude
                  <input name="originLatitude" type="number" step="any" min="-26.6" max="-25.9" defaultValue={settings.originLatitude ?? ""} className={inputClass} />
                </label>
                <label className="text-sm font-semibold">Longitude
                  <input name="originLongitude" type="number" step="any" min="-49.3" max="-48.4" defaultValue={settings.originLongitude ?? ""} className={inputClass} />
                </label>
              </div>
            </details>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-bold">Valores da entrega</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Valor mínimo (R$)
                <input name="minimumFee" type="number" step="0.01" min="0" max="9999.99" defaultValue={money(settings.minimumFeeCents)} className={inputClass} />
              </label>
              <label className="block text-sm font-semibold">Preço por km (R$)
                <input name="perKm" type="number" step="0.01" min="0.01" max="9999.99" defaultValue={money(settings.perKmCents)} className={inputClass} />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input name="roundTrip" type="checkbox" defaultChecked={settings.roundTrip} className="h-5 w-5 accent-pink-600" />Cobrar o trajeto de ida e volta
            </label>
            <p className="text-xs text-neutral-600">Frete = o maior valor entre o mínimo e a distância × preço por km. O mínimo não é somado ao valor por km. Frações de km são proporcionais, com arredondamento para centavos.</p>
          </fieldset>
          <button type="submit" className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white hover:bg-pink-700">Salvar configurações</button>
        </form>
        <p className="text-xs text-neutral-600">Se não houver endereço confiável, rota ou consultas disponíveis, o cliente poderá corrigir os dados ou falar com a Mila antes de pagar. O sistema limita o uso a 2.400 créditos reservados por dia (UTC); outras aplicações na mesma conta também consomem a franquia.</p>
        <p className="text-xs text-neutral-500">Powered by <a href="https://www.geoapify.com/" className="underline">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap contributors</a></p>
      </div>
    </main>
  );
}
