import { db } from "../../db";
import { products, productImages } from "../../db/schema";
import { eq, desc, like, sql, sum, count, and } from "drizzle-orm";
import { deleteProductAction, registerSaleAction, toggleProductStatusAction } from "./actions";
import { SearchBox } from "../../components/SearchBox";
import { SuccessBanner } from "../../components/SuccessBanner";
import Link from "next/link";
import { PriceInput } from "./PriceInput";
import { productSchema } from "../../db/validator";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface AdminPageProps {
  searchParams: Promise<{ success?: string; search?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { success, search = "" } = await searchParams;

  // Métricas do Painel
  const [metrics] = await db.select({
    totalProducts: count(products.id),
    totalStockValue: sum(sql`${products.price} * ${products.stock}`),
  }).from(products);

  const productList = await db
    .select({
      id: products.id,
      title: products.title,
      price: products.price,
      stock: products.stock,
      size: products.size,
      status: products.status,
      imageUrl: sql<string>`(SELECT url FROM product_images WHERE product_images.product_id = products.id ORDER BY is_main DESC, id ASC LIMIT 1)`,
    })
    .from(products)
    .where(search ? like(products.title, `%${search}%`) : undefined)
    .orderBy(desc(products.id)); async function handleCreate(formData: FormData) {
      'use server';
      const priceInput = String(formData.get("price") || "").trim();
      const sanitizedPrice = priceInput.replace(/[^\d,]/g, "").replace(",", ".");
      const stockInput = String(formData.get("stock") || "").trim();

      const rawData = {
        title: formData.get("title"),
        description: formData.get("description") || "",
        price: sanitizedPrice === "" ? NaN : Number(sanitizedPrice),
        stock: stockInput === "" ? NaN : Number(stockInput),
        categoryId: formData.get("categoryId") || "roupas",
        size: formData.get("size") || "M",
      };

      const validation = productSchema.safeParse(rawData);
      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }

      const { title, description, price, stock, categoryId, size } = validation.data;
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      const productId = randomUUID();
      const imageFiles = formData.getAll("images") as File[];

      await db.insert(products).values({
        id: productId,
        title,
        slug: `${slug}-${productId.slice(0, 5)}`,
        description: description || null,
        price: price.toString(),
        stock,
        categoryId,
        size,
        status: "AVAILABLE",
      });

      // Upload de Múltiplas Imagens para o Cloudinary
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        if (imageFile && imageFile.size > 0) {
          const arrayBuffer = await imageFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const imageUrl = await new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "desapego-mila" },
              (error, result) => {
                if (error) reject(error);
                else if (result) resolve(result.secure_url);
                else reject(new Error("Erro no upload"));
              }
            );
            uploadStream.end(buffer);
          });

          await db.insert(productImages).values({
            id: randomUUID(),
            url: imageUrl,
            isMain: i === 0 ? 1 : 0, // Primeira foto é a principal
            productId,
          });
        }
      }

      revalidatePath("/");
      revalidatePath("/admin");
      redirect("/admin?success=cadastrado");
    }

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-pink-500">Painel Administrativo</h1>
            <p className="text-neutral-400 text-sm mt-1">Gerencie os garimpos e o estoque da lojinha.</p>
          </div>
          <Link href="/" className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full hover:border-pink-600 transition-all">
            Ver Vitrine Pública →
          </Link>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase">Total de Peças no Catálogo</p>
              <h3 className="text-2xl font-bold text-white mt-1">{metrics.totalProducts || 0}</h3>
            </div>
            <div className="w-10 h-10 bg-pink-600/20 text-pink-500 rounded-xl flex items-center justify-center font-bold">📦</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase">Valor Total em Estoque</p>
              <h3 className="text-2xl font-bold text-pink-400 mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(metrics.totalStockValue || 0))}
              </h3>
            </div>
            <div className="w-10 h-10 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">💰</div>
          </div>
        </div>

        {/* Mensagem de Sucesso */}
        {success === 'cadastrado' && <SuccessBanner message="✨ Peça cadastrada com sucesso na vitrine!" />}
        {success === 'atualizado' && <SuccessBanner message="💾 Alterações salvas com sucesso!" />}
        {success === 'status' && <SuccessBanner message="🔄 Status do produto atualizado!" />}

        {/* Formulário de Cadastro com Múltiplas Fotos e Tamanho */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">✨ Cadastrar Novo Garimpo</h2>
          <form action={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Título da Peça *</label>
                <input type="text" name="title" required placeholder="Ex: Vestido Midi Vintage" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Tamanho *</label>
                <select name="size" defaultValue="M" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-600 outline-none">
                  <option value="PP">PP</option>
                  <option value="P">P</option>
                  <option value="M">M</option>
                  <option value="G">G</option>
                  <option value="GG">GG</option>
                  <option value="Único">Único</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Categoria / Setor *</label>
                <select name="categoryId" defaultValue="roupas" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-600 outline-none">
                  <option value="roupas">👗 Roupas (Principal)</option>
                  <option value="novidades">✨ Novidades do Dia (Carrossel)</option>
                  <option value="acessorios">👜 Acessórios</option>
                  <option value="calcados">👠 Calçados</option>
                  <option value="utilidades">🏠 Utilidades Domésticas</option>
                  <option value="brinquedos">🧸 Brinquedos</option>
                  <option value="perfumaria">✨ Perfumaria</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Preço (R$) *</label>
                <PriceInput />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Estoque (Qtd) *</label>
                <input type="number" name="stock" defaultValue={1} min={1} required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-600 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Fotos da Peça (Múltiplas)</label>
                <input type="file" name="images" accept="image/*" multiple className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-pink-400 cursor-pointer pt-1.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 uppercase">Descrição</label>
              <textarea name="description" rows={3} placeholder="Detalhes da peça, tamanho, estado de conservação..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-600 outline-none resize-none"></textarea>
            </div>

            <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-pink-600/20 cursor-pointer">
              Cadastrar Peça na Vitrine
            </button>
          </form>
        </div>

        {/* Lista de Gerenciamento */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white">
              Gerenciar Peças na Vitrine ({productList.length})
            </h2>
            <SearchBox initialValue={search} placeholder="Buscar no estoque..." isAdmin={true} />
          </div>

          <div className="space-y-3">
            {productList.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
                Nenhum produto encontrado com esse termo no estoque.
              </div>
            ) : (
              productList.map((product) => {
                const stockNum = Number(product.stock) || 0;
                const isSold = stockNum === 0 || (product.status === 'SOLD' && stockNum <= 1);

                return (
                  <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex-shrink-0 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-neutral-600">Sem Foto</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white text-sm">{product.title}</h3>
                          <span className="text-[10px] bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded font-bold">
                            Tam: {product.size}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-pink-400 font-bold text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                          </span>
                          <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                            Estoque: <strong>{stockNum}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <form action={async () => {
                        'use server';
                        if (stockNum > 1) {
                          await registerSaleAction(product.id);
                        } else {
                          await toggleProductStatusAction(product.id, product.status || 'AVAILABLE');
                        }
                      }}>
                        <button
                          type="submit"
                          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${isSold
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-amber-950 text-amber-400 border border-amber-800 hover:bg-amber-900'
                            }`}
                        >
                          {isSold ? 'Marcar Disponível' : 'Marcar Vendido'}
                        </button>
                      </form>

                      <Link
                        href={`/admin/edit/${product.id}`}
                        className="text-xs bg-neutral-800 text-neutral-300 hover:text-white px-4 py-2 rounded-lg transition-all"
                      >
                        Editar
                      </Link>

                      <form action={async () => {
                        'use server';
                        await deleteProductAction(product.id);
                      }}>
                        <button
                          type="submit"
                          className="text-xs bg-red-950/60 border border-red-900/50 text-red-400 hover:bg-red-900/60 px-4 py-2 rounded-lg transition-all cursor-pointer"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </main>
  );
}