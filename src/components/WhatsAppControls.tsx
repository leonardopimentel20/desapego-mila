'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestWhatsAppDisconnectAction, setWhatsAppEnabledAction } from '../app/admin/actions';

interface WhatsAppControlsProps {
  enabled: boolean;
}

export function WhatsAppControls({ enabled }: WhatsAppControlsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    startTransition(() => {
      void setWhatsAppEnabledAction(!enabled).then(() => router.refresh());
    });
  };

  const disconnect = () => {
    if (!window.confirm('Desconectar o número do WhatsApp? Será necessário escanear um novo QR Code para voltar.')) return;
    startTransition(() => {
      void requestWhatsAppDisconnectAction().then(() => router.refresh());
    });
  };

  return (
    <section id="whatsapp" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Atendimento pelo WhatsApp</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {enabled ? 'Atendimento automático ativo.' : 'Atendimento pausado. A sessão continua preservada.'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {enabled ? 'ATIVO' : 'PAUSADO'}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={toggle} disabled={isPending} className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {isPending ? 'Salvando...' : enabled ? 'Pausar atendimento' : 'Reativar atendimento'}
        </button>
        <button type="button" onClick={disconnect} disabled={isPending} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50">
          Desconectar número
        </button>
      </div>
    </section>
  );
}
