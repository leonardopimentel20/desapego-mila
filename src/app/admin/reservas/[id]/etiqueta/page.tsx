import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "../../../../../db";
import { reservations } from "../../../../../db/schema";
import { PrintDeliveryLabel } from "../../../../../components/PrintDeliveryLabel";

export const dynamic = "force-dynamic";

export default async function DeliveryLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!reservation || reservation.deliveryMethod !== "motoboy" || reservation.status === "CANCELLED") notFound();
  const complete = reservation.deliveryRecipient && reservation.deliveryPhone && reservation.deliveryStreet
    && reservation.deliveryNumber && reservation.deliveryNeighborhood;

  return (
    <main className="min-h-screen bg-neutral-100 p-6 text-neutral-950 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="print:hidden">
          {complete ? <PrintDeliveryLabel /> : (
            <p role="alert" className="rounded-xl bg-amber-100 p-4 text-amber-950">
              Esta reserva ainda não tem os dados completos de entrega. Solicite a confirmação do endereço pelo WhatsApp antes de imprimir.
            </p>
          )}
        </div>
        <article className="break-inside-avoid space-y-4 border-2 border-neutral-900 bg-white p-6 [overflow-wrap:anywhere]">
          <header className="border-b-2 border-neutral-900 pb-3">
            <h1 className="text-xl font-extrabold">Desapego da Mila</h1>
            <p className="font-bold">Etiqueta de entrega • Motoboy</p>
          </header>
          {!complete && <p className="font-bold">DADOS INCOMPLETOS — NÃO DESPACHAR</p>}
          <div>
            <p className="text-xs font-bold uppercase">Destinatário</p>
            <p className="text-xl font-bold">{reservation.deliveryRecipient || reservation.customerName}</p>
            <p>Telefone: <strong>{reservation.deliveryPhone || reservation.customerPhone}</strong></p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase">Endereço</p>
            <p className="text-lg font-bold">{reservation.deliveryStreet || "Não informado"}, {reservation.deliveryNumber || "número não informado"}</p>
            <p>{reservation.deliveryNeighborhood || "Bairro e cidade não informados"}</p>
            <p>Complemento: {reservation.deliveryComplement || "Não informado"}</p>
            <p>Referência: {reservation.deliveryReference || "Não informada"}</p>
          </div>
          <footer className="space-y-1 border-t-2 border-neutral-900 pt-3 text-sm">
            <p className="font-bold">ID da compra / reserva</p>
            <p className="font-mono">{reservation.id}</p>
            <p>{reservation.status === "CONFIRMED" ? "Venda confirmada" : "Reserva aguardando confirmação da Mila"}</p>
          </footer>
        </article>
      </div>
    </main>
  );
}
