'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestWhatsAppDisconnectAction, setWhatsAppEnabledAction } from '../app/admin/actions';

interface WhatsAppControlsProps {
  enabled: boolean;
  disconnectRequested: boolean;
  connectedPhone: string | null;
  qrCode: string | null;
}

function formatPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

export function WhatsAppControls({ enabled, disconnectRequested, connectedPhone, qrCode }: WhatsAppControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!enabled || connectedPhone) return;
    const refreshTimer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(refreshTimer);
  }, [connectedPhone, enabled, router]);

  const toggle = () => {
    setFeedback(null);
    startTransition(() => {
      void setWhatsAppEnabledAction(!enabled)
        .then(() => {
          setFeedback(enabled ? 'Atendimento pausado com sucesso.' : 'Atendimento reativado com sucesso.');
          router.refresh();
        })
        .catch(() => setFeedback('Não foi possível atualizar o atendimento agora.'));
    });
  };

  const disconnect = () => {
    setFeedback(null);
    startTransition(() => {
      void requestWhatsAppDisconnectAction()
        .then(() => {
          setShowDisconnectDialog(false);
          setFeedback('Solicitação enviada. O WhatsApp será desconectado pelo serviço em alguns segundos.');
          router.refresh();
        })
        .catch(() => setFeedback('Não foi possível solicitar a desconexão agora.'));
    });
  };

  return (
    <section id="whatsapp" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Atendimento pelo WhatsApp</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {disconnectRequested
              ? 'Número desconectado. Reative para gerar um novo QR Code nesta tela.'
              : enabled
                ? 'Atendimento automático ativo.'
                : 'Atendimento pausado. A sessão continua preservada.'}
          </p>
          <p className="mt-2 text-sm font-semibold text-neutral-700">
            Número conectado: {formatPhone(connectedPhone) || 'aguardando pareamento por QR Code'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {disconnectRequested ? 'DESCONECTADO' : enabled ? 'ATIVO' : 'PAUSADO'}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={toggle} disabled={isPending} className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {isPending ? 'Salvando...' : disconnectRequested ? 'Gerar novo QR Code' : enabled ? 'Pausar atendimento' : 'Reativar atendimento'}
        </button>
        <button type="button" onClick={() => setShowDisconnectDialog(true)} disabled={isPending} className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50">
          Desconectar número
        </button>
      </div>
      {enabled && !connectedPhone && (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-pink-100 bg-pink-50 p-4 text-center">
          {qrCode ? (
            <>
              <p className="text-sm font-extrabold text-neutral-800">Escaneie este QR Code pelo WhatsApp</p>
              <img src={qrCode} alt="QR Code para conectar o WhatsApp" className="h-64 w-64 rounded-xl bg-white p-2 shadow-sm" />
              <p className="max-w-sm text-xs leading-relaxed text-neutral-600">
                No celular: Configurações → Dispositivos conectados → Conectar dispositivo.
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-neutral-600">Gerando QR Code para pareamento...</p>
          )}
        </div>
      )}
      {feedback && (
        <p role="status" className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
          {feedback}
        </p>
      )}

      {showDisconnectDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-disconnect-title"
          onClick={() => !isPending && setShowDisconnectDialog(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 id="whatsapp-disconnect-title" className="text-base font-extrabold text-neutral-900">
                Desconectar WhatsApp
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                O número será desconectado e a sessão atual será encerrada. Para voltar, será necessário escanear um novo QR Code.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisconnectDialog(false)}
                disabled={isPending}
                className="rounded-xl bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {isPending ? 'Solicitando...' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
