import { db } from "../../db";
import { products, reservations, reservationItems, whatsappSettings } from "../../db/schema";
import { eq, desc, like, sql, sum, count, and, gt } from "drizzle-orm";
import { deleteProductAction, registerSaleAction, setProductStatusAction, createProductAction, confirmReservationAction, cancelReservationAction, removeReservationItemAction } from "./actions";
import { SearchBox } from "../../components/SearchBox";
import { SuccessBanner } from "../../components/SuccessBanner";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ProductForm } from "../../components/ProductForm";
import { DeleteButton } from "../../components/DeleteButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhatsAppControls } from "../../components/WhatsAppControls";

interface AdminPageProps {
  searchParams: Promise<{ success?: string; error?: string; search?: string; status?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedParams = await searchParams;
  const success = resolvedParams?.success;
  const error = resolvedParams?.error;
  const search = resolvedParams?.search || "";
  const status = resolvedParams?.status || "all";
  const [whatsappSetting] = await db.select({ enabled: whatsappSettings.enabled }).from(whatsappSettings).where(eq(whatsappSettings.id, 1));

  // Métricas gerais do catálogo
  const [metrics] = await db.select({
    totalProducts: count(products.id),
    totalStockValue: sum(sql`${products.price} * ${products.stock}`),
  }).from(products);

  // Consulta de produtos vendidos para contagem rápida
  const [salesMetrics] = await db.select({
    totalSold: sum(products.soldQuantity),
    totalRevenue: sum(sql`${products.price} * ${products.soldQuantity}`),
  }).from(products);

  // Condições de filtro por busca e status
  const conditions = [];
  if (search) {
    conditions.push(like(products.title, `%${search}%`));
  }
  if (status === 'AVAILABLE') {
    conditions.push(eq(products.status, 'AVAILABLE'));
  } else if (status === 'RESERVED') {
    conditions.push(gt(products.reservedQuantity, 0));
  } else if (status === 'SOLD') {
    conditions.push(gt(products.soldQuantity, 0));
  }

  // Consulta incluindo os dados da cliente e data de reserva
  const productList = await db
    .select({
      id: products.id,
      title: products.title,
      price: products.price,
      stock: products.stock,
      size: products.size,
      status: products.status,
      categoryId: products.categoryId,
      subcategory: products.subcategory,
      gender: products.gender,
      customerName: products.customerName,
      customerPhone: products.customerPhone,
      reservedQuantity: products.reservedQuantity,
      soldQuantity: products.soldQuantity,
      updatedAt: products.updatedAt,
      imageUrl: sql<string>`(SELECT url FROM product_images WHERE product_images.product_id = products.id ORDER BY is_main DESC, id ASC LIMIT 1)`,
    })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.id)); 

  const reservationData = await db.select({
    reservationId: reservations.id,
    reservationStatus: reservations.status,
    customerName: reservations.customerName,
    customerPhone: reservations.customerPhone,
    deliveryMethod: reservations.deliveryMethod,
    deliveryNeighborhood: reservations.deliveryNeighborhood,
    deliveryFee: reservations.deliveryFee,
    reservationCreatedAt: reservations.createdAt,
    reservationUpdatedAt: reservations.updatedAt,
    itemId: reservationItems.id,
    productId: reservationItems.productId,
    quantity: reservationItems.quantity,
    title: products.title,
    price: products.price,
    size: products.size,
    imageUrl: sql<string>`(SELECT url FROM product_images WHERE product_images.product_id = products.id ORDER BY is_main DESC, id ASC LIMIT 1)`,
  }).from(reservations)
    .innerJoin(reservationItems, eq(reservationItems.reservationId, reservations.id))
    .innerJoin(products, eq(products.id, reservationItems.productId))
    ;
  const pendingReservationRows = reservationData.filter((item) => item.reservationStatus === "PENDING");
  const pendingReservationCount = new Set(pendingReservationRows.map((item) => item.reservationId)).size;
  const pendingItemCount = pendingReservationRows.reduce((total, item) => total + item.quantity, 0);

  // Agrupa itens pela reserva persistida (e não apenas pelo nome do cliente).
  const shouldBuildReservationGroups = status === 'RESERVED' || search.trim() !== "";
  const reservedGroups = shouldBuildReservationGroups ? reservationData.reduce((acc, item) => {
    const reservationMatchesSearch = !search
      || item.customerName.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      || item.customerPhone.includes(search)
      || item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    if (!reservationMatchesSearch) return acc;

    if (!acc[item.reservationId]) {
      acc[item.reservationId] = {
        reservationId: item.reservationId,
        reservationStatus: item.reservationStatus,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        deliveryMethod: item.deliveryMethod,
        deliveryNeighborhood: item.deliveryNeighborhood,
        deliveryFee: item.deliveryFee,
        createdAt: item.reservationCreatedAt,
        updatedAt: item.reservationUpdatedAt,
        products: [],
        totalValue: 0,
      };
    }
    acc[item.reservationId].products.push(item);
    acc[item.reservationId].totalValue += Number(item.price) * item.quantity;
    return acc;
  }, {} as Record<string, { reservationId: string; reservationStatus: string; customerName: string; customerPhone: string; deliveryMethod: string | null; deliveryNeighborhood: string | null; deliveryFee: string | null; createdAt: Date | null; updatedAt: Date | null; products: typeof reservationData; totalValue: number }>) : null;

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6 bg-white p-6 rounded-3xl shadow-xs">
          <div>
            <h1 className="text-2xl font-extrabold text-pink-600">Painel Administrativo</h1>
            <p className="text-neutral-500 text-sm mt-1">Gerencie os garimpos e o estoque da lojinha.</p>
          </div>
          <Link href="/" className="text-xs text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-full hover:border-pink-400 hover:text-pink-600 transition-all font-semibold shadow-xs">
            Ver Vitrine Pública →
          </Link>
        </div>

        {pendingReservationCount > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-xl leading-none">🔔</span>
              <div>
                <p className="font-extrabold text-sm">
                  {pendingReservationCount === 1 ? "Há uma reserva aguardando atendimento." : `Há ${pendingReservationCount} reservas aguardando atendimento.`}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {pendingItemCount} {pendingItemCount === 1 ? "unidade reservada" : "unidades reservadas"} aguardando confirmação ou cancelamento.
                </p>
              </div>
            </div>
            <Link
              href="/admin?status=RESERVED#reservas"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Ver reservas agora
            </Link>
          </div>
        )}

        {/* Barra de Métricas Minimalista */}
        <nav aria-label="Atalhos do painel" className="sticky top-3 z-10 flex items-center gap-2 overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white/95 p-2 shadow-sm backdrop-blur">
          <Link href="/admin#resumo" className="whitespace-nowrap rounded-xl bg-pink-600 px-3 py-2 text-[11px] font-extrabold text-white">Resumo</Link>
          <Link href="/admin?status=RESERVED#reservas" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-neutral-600 hover:bg-neutral-100">Reservas {pendingReservationCount > 0 && `(${pendingReservationCount})`}</Link>
          <Link href="/admin#estoque" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-neutral-600 hover:bg-neutral-100">Estoque</Link>
          <Link href="/admin#novo-produto" className="whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold text-neutral-600 hover:bg-neutral-100">Novo produto</Link>
        </nav>

        <section id="resumo" aria-labelledby="summary-title" className="scroll-mt-20 space-y-3">
          <div>
            <h2 id="summary-title" className="text-lg font-extrabold text-neutral-900">Visão geral do negócio</h2>
            <p className="mt-1 text-xs text-neutral-500">Acompanhe o que já entrou e o que ainda está disponível para vender.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:col-span-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Faturamento realizado</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(salesMetrics?.totalRevenue || 0))}
              </p>
              <p className="mt-2 text-xs text-emerald-800">Valor total das peças confirmadas como vendidas.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Peças vendidas</p>
                <p className="mt-2 text-xl font-black text-neutral-900">{salesMetrics?.totalSold || 0}</p>
                <p className="mt-1 text-xs text-neutral-500">Unidades já finalizadas.</p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Catálogo</p>
                <p className="mt-2 text-xl font-black text-neutral-900">{metrics.totalProducts || 0}</p>
                <p className="mt-1 text-xs text-neutral-500">Produtos cadastrados.</p>
              </div>
              <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-pink-700">Estoque disponível</p>
                <p className="mt-2 text-xl font-black text-pink-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(metrics.totalStockValue || 0))}
                </p>
                <p className="mt-1 text-xs text-pink-800">Valor das unidades que ainda podem ser vendidas.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">Aguardando atendimento</p>
                <p className="mt-2 text-xl font-black text-amber-700">{pendingReservationCount}</p>
                <p className="mt-1 text-xs text-amber-800">Reservas que precisam de uma decisão.</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400">Dica: o faturamento mostra vendas realizadas; o estoque disponível mostra o potencial que ainda está na vitrine.</p>
        </section>

        {/* Mensagem de Sucesso */}
        {success === 'cadastrado' && <SuccessBanner message="✨ Peça cadastrada com sucesso na vitrine!" />}
        {success === 'atualizado' && <SuccessBanner message="💾 Alterações salvas com sucesso!" />}
        {success === 'status' && <SuccessBanner message="🔄 Status do produto atualizado!" />}
        {success === 'excluido' && <SuccessBanner message="🗑️ Garimpo excluído com sucesso!" />}
        {error && <ErrorBanner message={error} />}

        <WhatsAppControls enabled={whatsappSetting?.enabled === 1} />

        {/* Formulário Dinâmico de Cadastro usando a action centralizada */}
        <details id="novo-produto" className="scroll-mt-20 rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-extrabold text-neutral-900 [&::-webkit-details-marker]:hidden">
            <span>＋ Cadastrar novo produto</span>
            <span aria-hidden="true" className="text-neutral-400 transition-transform [details[open]_&]:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-neutral-100 p-4">
            <ProductForm action={createProductAction} />
          </div>
        </details>

        {/* Lista de Gerenciamento */}
        <div id="estoque" className="scroll-mt-20 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Estoque e vitrine</h2>
              <p className="mt-1 text-xs text-neutral-500">Consulte, edite e atualize os produtos disponíveis para venda.</p>
            </div>
            <SearchBox initialValue={search} placeholder="Buscar produto ou cliente..." isAdmin={true} />
          </div>

          {/* Abas de Filtro por Status */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Link
              href={`/admin?status=all&search=${search}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${status === 'all' ? 'bg-pink-600 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
            >
              Todos
            </Link>
            <Link
              href={`/admin?status=AVAILABLE&search=${search}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${status === 'AVAILABLE' ? 'bg-pink-600 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
            >
              Disponíveis
            </Link>
            <Link
              href={`/admin?status=RESERVED&search=${search}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${status === 'RESERVED' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
            >
              Reservados ⏳
            </Link>
            <Link
              href={`/admin?status=SOLD&search=${search}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${status === 'SOLD' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
            >
              Vendidos
            </Link>
          </div>

          {/* Renderização em Cards para Reservados vs Linhas normais para outros */}
          <div id="reservas" className="scroll-mt-6 space-y-3">
            {reservedGroups && (status === 'RESERVED' || (search.trim() !== "" && Object.keys(reservedGroups).length > 0)) ? (
              Object.keys(reservedGroups).length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center text-neutral-500 shadow-xs">
                  Nenhuma reserva pendente no momento.
                </div>
              ) : (
                Object.entries(reservedGroups).map(([key, group]) => {
                  const statusLabel = group.reservationStatus === "PENDING"
                    ? "Aguardando aprovação"
                    : group.reservationStatus === "CONFIRMED"
                      ? "Finalizada / vendida"
                      : "Cancelada";
                  const statusClass = group.reservationStatus === "PENDING"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : group.reservationStatus === "CONFIRMED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700";

                  return (
                  <details key={key} className={`group rounded-2xl border-2 bg-white shadow-sm ${statusClass.split(" ")[0]}`}>
                    {/* Cabeçalho do Card da Cliente */}
                    <summary className="flex cursor-pointer list-none flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-2xl px-4 py-3 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <h3 className="font-bold text-neutral-900 text-sm">👤 {group.customerName}</h3>
                        </div>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          WhatsApp: <strong className="text-neutral-800">{group.customerPhone}</strong> • {group.products.length} {group.products.length === 1 ? "item" : "itens"}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          Solicitada em: <strong className="text-neutral-800">
                            {group.createdAt ? new Date(group.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Data não registrada"}
                          </strong>
                        </p>
                        {group.deliveryMethod && (
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Recebimento: <strong className="text-neutral-800">
                              {group.deliveryMethod === "motoboy" ? "Motoboy" : "Retirada com a Mila"}
                              {group.deliveryNeighborhood ? ` • ${group.deliveryNeighborhood}` : ""}
                              {group.deliveryFee ? ` • Taxa ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(group.deliveryFee))}` : ""}
                            </strong>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:text-right">
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Total</span>
                          <span className="text-sm font-black text-pink-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.totalValue)}
                          </span>
                        </div>
                        <span aria-hidden="true" className="text-neutral-400 transition-transform group-open:rotate-180">⌄</span>
                      </div>
                    </summary>

                    {/* Lista de Peças solicitadas por essa cliente */}
                    <div className="space-y-2 border-t border-neutral-100 px-4 pb-4 pt-3">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Garimpos solicitados ({group.products.length}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.products.map((product) => {
                          const reservedQuantity = product.quantity;
                          return (
                            <div key={product.itemId} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-neutral-200 rounded-lg overflow-hidden flex-shrink-0">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] text-neutral-400 flex items-center justify-center h-full">Sem Foto</span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-neutral-900 text-xs line-clamp-1">{product.title}</h4>
                                  <p className="text-[11px] text-neutral-500">Tam: <strong className="text-pink-600">{product.size}</strong></p>
                                  <p className="text-[11px] text-neutral-600">Quantidade reservada: <strong>{reservedQuantity}</strong></p>
                                  <p className="text-xs font-black text-neutral-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price) * reservedQuantity)}
                                  </p>
                                </div>
                              </div>

                              {/* Ações individuais do item dentro do card */}
                              {group.reservationStatus === "PENDING" && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <form action={async () => {
                                  'use server';
                                  try {
                                    await removeReservationItemAction(product.itemId);
                                  } catch (actionError) {
                                    const message = actionError instanceof Error ? actionError.message : "Tente novamente.";
                                    const params = new URLSearchParams({ status: "RESERVED", error: message });
                                    redirect(`/admin?${params.toString()}`);
                                  }
                                  }}>
                                    <button type="submit" className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer">
                                      Remover 1 unidade
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
                      {group.reservationStatus === "PENDING" && (
                        <form action={async () => {
                          'use server';
                          try {
                            await confirmReservationAction(group.reservationId);
                          } catch (actionError) {
                            const message = actionError instanceof Error ? actionError.message : "Tente novamente.";
                            redirect(`/admin?status=RESERVED&error=${encodeURIComponent(message)}`);
                          }
                        }}>
                          <button type="submit" className="text-xs bg-emerald-600 text-white font-bold px-3 py-2 rounded-lg">Confirmar reserva</button>
                        </form>
                      )}
                      {group.reservationStatus === "PENDING" && (
                        <form action={async () => {
                          'use server';
                          try {
                            await cancelReservationAction(group.reservationId);
                          } catch (actionError) {
                            const message = actionError instanceof Error ? actionError.message : "Tente novamente.";
                            redirect(`/admin?status=RESERVED&error=${encodeURIComponent(message)}`);
                          }
                        }}>
                          <button type="submit" className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-bold px-3 py-2 rounded-lg">Cancelar reserva</button>
                        </form>
                      )}
                    </div>
                  </details>
                  );
                })
              )
            ) : (
              productList.length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center text-neutral-500 shadow-xs">
                  Nenhum produto encontrado com esse termo ou status no estoque.
                </div>
              ) : (
                productList.map((product) => {
                  const stockNum = Number(product.stock) || 0;
                  const reservedQuantity = product.reservedQuantity;
                  const soldQuantity = product.soldQuantity;
                  const isReserved = reservedQuantity > 0;
                  const isSold = product.status === 'SOLD' && reservedQuantity === 0;
                  const hasAvailableStock = stockNum > 0;

                  return (
                    <div key={product.id} className="bg-white border border-neutral-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0 flex items-center justify-center relative">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-neutral-400">Sem Foto</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-neutral-900 text-sm">{product.title}</h3>
                            <span className="text-[10px] bg-pink-50 text-pink-600 border border-pink-100 px-2 py-0.5 rounded font-bold">
                              Tam: {product.size}
                            </span>
                            {isReserved && (
                              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-extrabold uppercase shadow-xs">
                                Reservado: {reservedQuantity} {reservedQuantity === 1 ? 'unidade' : 'unidades'} ⏳
                              </span>
                            )}
                            {isSold && (
                              <span className="text-[10px] bg-neutral-900 text-white px-2 py-0.5 rounded font-extrabold uppercase shadow-xs">
                                Vendido
                              </span>
                            )}
                            {!isSold && soldQuantity > 0 && (
                              <span className="text-[10px] bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded font-extrabold uppercase">
                                Vendido: {soldQuantity}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                            <span className="text-pink-600 font-bold text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                            </span>
                            <span>Cat: <strong>{product.categoryId}</strong></span>
                            {product.subcategory && product.subcategory !== 'todas' && (
                              <span>Sub: <strong>{product.subcategory}</strong></span>
                            )}
                            <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
                              Estoque: <strong>{stockNum}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <form action={async () => {
                          'use server';
                          try {
                            if (isSold) {
                              await setProductStatusAction(product.id, 'AVAILABLE');
                            } else if (hasAvailableStock) {
                              await registerSaleAction(product.id);
                            }
                          } catch (actionError) {
                            const message = actionError instanceof Error ? actionError.message : "Tente novamente.";
                            redirect(`/admin?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&error=${encodeURIComponent(message)}`);
                          }
                        }}>
                          <button
                            type="submit"
                            disabled={!isSold && !hasAvailableStock}
                            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                              isSold
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : hasAvailableStock
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                  : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                            }`}
                          >
                            {isSold
                              ? 'Marcar Disponível'
                              : hasAvailableStock
                                ? 'Marcar Vendido'
                                : 'Sem estoque disponível'}
                          </button>
                        </form>

                        <Link
                          href={`/admin/edit/${product.id}`}
                          className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-all"
                        >
                          Editar
                        </Link>

                        {/* Botão de Exclusão Blindado com Confirmação */}
                        <DeleteButton productId={product.id} deleteAction={deleteProductAction} />
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
