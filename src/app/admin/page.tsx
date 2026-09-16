import { db } from "../../db";
import { products } from "../../db/schema";
import { eq, desc, like, sql, sum, count, and } from "drizzle-orm";
import { deleteProductAction, registerSaleAction, setProductStatusAction, createProductAction } from "./actions";
import { SearchBox } from "../../components/SearchBox";
import { SuccessBanner } from "../../components/SuccessBanner";
import { ProductForm } from "../../components/ProductForm";
import { DeleteButton } from "../../components/DeleteButton";
import Link from "next/link";

interface AdminPageProps {
  searchParams: Promise<{ success?: string; search?: string; status?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedParams = await searchParams;
  const success = resolvedParams?.success;
  const search = resolvedParams?.search || "";
  const status = resolvedParams?.status || "all";

  // Métricas gerais do catálogo
  const [metrics] = await db.select({
    totalProducts: count(products.id),
    totalStockValue: sum(sql`${products.price} * ${products.stock}`),
  }).from(products);

  // Consulta de produtos vendidos para contagem rápida
  const [salesMetrics] = await db.select({
    totalSold: count(products.id),
    totalRevenue: sum(products.price),
  })
  .from(products)
  .where(eq(products.status, 'SOLD'));

  // Condições de filtro por busca e status
  const conditions = [];
  if (search) {
    conditions.push(like(products.title, `%${search}%`));
  }
  if (status === 'AVAILABLE') {
    conditions.push(eq(products.status, 'AVAILABLE'));
  } else if (status === 'RESERVED') {
    conditions.push(eq(products.status, 'RESERVED'));
  } else if (status === 'SOLD') {
    conditions.push(eq(products.status, 'SOLD'));
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
      updatedAt: products.updatedAt,
      imageUrl: sql<string>`(SELECT url FROM product_images WHERE product_images.product_id = products.id ORDER BY is_main DESC, id ASC LIMIT 1)`,
    })
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.id)); 

  // Lógica para agrupar produtos por cliente quando estiver na aba de Reservados
  type AdminProduct = (typeof productList)[number];
  const reservedGroups = status === 'RESERVED' ? productList.reduce((acc, product) => {
    const clientKey = product.customerName && product.customerPhone 
      ? `${product.customerName}_${product.customerPhone}` 
      : 'cliente_geral';

    if (!acc[clientKey]) {
      acc[clientKey] = {
        customerName: product.customerName || 'Cliente do WhatsApp',
        customerPhone: product.customerPhone || 'Não informado',
        updatedAt: product.updatedAt,
        products: [],
        totalValue: 0
      };
    }
    
    acc[clientKey].products.push(product);
    acc[clientKey].totalValue += Number(product.price) * Math.max(product.reservedQuantity, 1);
    return acc;
  }, {} as Record<string, { customerName: string; customerPhone: string; updatedAt: Date | null; products: AdminProduct[]; totalValue: number }>) : null;

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

        {/* Barra de Métricas Minimalista */}
        <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-xs divide-y md:divide-y-0 md:divide-x divide-neutral-100">
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Catálogo Total</p>
            <p className="text-lg font-black text-neutral-900 mt-0.5">{metrics.totalProducts || 0} <span className="text-xs font-normal text-neutral-400">peças</span></p>
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Valor em Estoque</p>
            <p className="text-lg font-black text-pink-600 mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(metrics.totalStockValue || 0))}
            </p>
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Vendidos</p>
            <p className="text-lg font-black text-neutral-900 mt-0.5">{salesMetrics?.totalSold || 0} <span className="text-xs font-normal text-neutral-400">peças</span></p>
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Faturamento</p>
            <p className="text-lg font-black text-emerald-600 mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(salesMetrics?.totalRevenue || 0))}
            </p>
          </div>
        </div>

        {/* Mensagem de Sucesso */}
        {success === 'cadastrado' && <SuccessBanner message="✨ Peça cadastrada com sucesso na vitrine!" />}
        {success === 'atualizado' && <SuccessBanner message="💾 Alterações salvas com sucesso!" />}
        {success === 'status' && <SuccessBanner message="🔄 Status do produto atualizado!" />}
        {success === 'excluido' && <SuccessBanner message="🗑️ Garimpo excluído com sucesso!" />}

        {/* Formulário Dinâmico de Cadastro usando a action centralizada */}
        <ProductForm action={createProductAction} />

        {/* Lista de Gerenciamento */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-neutral-900">
              Gerenciar Peças na Vitrine ({productList.length})
            </h2>
            <SearchBox initialValue={search} placeholder="Buscar no estoque..." isAdmin={true} />
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
          <div className="space-y-3">
            {status === 'RESERVED' && reservedGroups ? (
              Object.keys(reservedGroups).length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center text-neutral-500 shadow-xs">
                  Nenhuma reserva pendente no momento.
                </div>
              ) : (
                Object.entries(reservedGroups).map(([key, group]) => (
                  <div key={key} className="bg-white border-2 border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    {/* Cabeçalho do Card da Cliente */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                            Reserva ⏳
                          </span>
                          <h3 className="font-bold text-neutral-900 text-sm">👤 {group.customerName}</h3>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          📱 WhatsApp: <strong className="text-neutral-800">{group.customerPhone}</strong> {group.updatedAt && `• ⏰ ${new Date(group.updatedAt).toLocaleString('pt-BR')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-neutral-400 uppercase tracking-wider block">Total da Sacola</span>
                        <span className="text-base font-black text-pink-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(group.totalValue)}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Peças solicitadas por essa cliente */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Garimpos solicitados ({group.products.length}):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.products.map((product) => {
                          const reservedQuantity = Math.max(product.reservedQuantity, 1);
                          return (
                            <div key={product.id} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
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
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <form action={async () => {
                                  'use server';
                                    await setProductStatusAction(product.id, 'AVAILABLE');
                                }}>
                                  <button type="submit" className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold px-2 py-1.5 rounded-lg transition-all cursor-pointer" title="Devolve a peça para disponível">
                                    Liberar
                                  </button>
                                </form>
                                <form action={async () => {
                                  'use server';
                                  // Chama a venda gradativa para decrementar o estoque corretamente
                                  await registerSaleAction(product.id);
                                }}>
                                  <button type="submit" className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer">
                                    Vender {reservedQuantity} {reservedQuantity === 1 ? 'unidade' : 'unidades'}
                                  </button>
                                </form>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              productList.length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center text-neutral-500 shadow-xs">
                  Nenhum produto encontrado com esse termo ou status no estoque.
                </div>
              ) : (
                productList.map((product) => {
                  const stockNum = Number(product.stock) || 0;
                  const isSold = product.status === 'SOLD' || stockNum === 0;
                  const isReserved = product.status === 'RESERVED';
                  const reservedQuantity = Math.max(product.reservedQuantity, 1);
                  const needsToBeAvailable = isSold;

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
                          if (isReserved) {
                            await registerSaleAction(product.id);
                          } else if (needsToBeAvailable) {
                            await setProductStatusAction(product.id, 'AVAILABLE');
                          } else {
                            await registerSaleAction(product.id);
                          }
                        }}>
                          <button
                            type="submit"
                            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                              needsToBeAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : isReserved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {needsToBeAvailable
                              ? 'Marcar Disponível'
                              : isReserved
                                ? `Vender ${reservedQuantity} ${reservedQuantity === 1 ? 'unidade' : 'unidades'}`
                                : 'Marcar Vendido'}
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
