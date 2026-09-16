'use server';


import { db } from "../../../../db";
import { products, productImages } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { updateProductAction, deleteProductImageAction, setMainImageAction } from "../../actions";
import { PriceInput } from "../../PriceInput";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SuccessBanner } from "../../../../components/SuccessBanner";
import { ConfirmButton } from "../../../../components/ConfirmButton";


interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ photoSuccess?: string }>;
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { id } = await params;
  const { photoSuccess } = await searchParams;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    notFound();
  }

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id));

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans selection:bg-pink-600 selection:text-white pb-20">

      {/* Cabeçalho */}
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-12 py-4 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-pink-600 font-sans">
              Editar Peça
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Atualize as informações, fotos ou estoque do garimpo.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-full hover:border-pink-500 hover:text-pink-600 transition-all font-semibold shadow-xs"
          >
            ← Voltar para o Painel
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-12 pt-6 space-y-3">
        {photoSuccess === 'excluida' && <SuccessBanner message="🗑️ Foto excluída com sucesso!" />}
        {photoSuccess === 'capa' && <SuccessBanner message="⭐ Foto definida como capa!" />}
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-12 py-8">

        {/* Formulário de Edição Principal */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
          <form action={updateProductAction.bind(null, product.id)} className="space-y-4">

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Título da Peça *</label>
              <input
                type="text"
                name="title"
                defaultValue={product.title}
                required
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Categoria Principal *</label>
                <select
                  name="categoryId"
                  defaultValue={product.categoryId || "roupas"}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
                >
                  <option value="roupas">👗 Roupas</option>
                  <option value="novidades">✨ Recém Chegados</option>
                  <option value="acessorios">👜 Acessórios</option>
                  <option value="calcados">👠 Calçados</option>
                  <option value="utilidades">🏠 Utilidades Domésticas</option>
                  <option value="brinquedos">🧸 Brinquedos</option>
                  <option value="perfumaria">✨ Perfumaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Público / Gênero *</label>
                <select
                  name="gender"
                  defaultValue={product.gender || "feminino"}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
                >
                  <option value="feminino">👩 Feminino</option>
                  <option value="masculino">👨 Masculino</option>
                  <option value="infantil-menina">👧 Infantil (Menina)</option>
                  <option value="infantil-menino">👦 Infantil (Menino)</option>
                  <option value="unissex">Unissex / Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Tamanho / Numeração *</label>
                <select
                  name="size"
                  defaultValue={product.size || "M"}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
                >
                  <optgroup label="Roupas (Adulto)">
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="Único">Único</option>
                  </optgroup>
                  <optgroup label="Roupas (Infantil)">
                    <option value="RN">RN (Recém-Nascido)</option>
                    <option value="P-Bebe">P Bebê</option>
                    <option value="M-Bebe">M Bebê</option>
                    <option value="G-Bebe">G Bebê</option>
                    <option value="1">1 ano</option>
                    <option value="2">2 anos</option>
                    <option value="3">3 anos</option>
                    <option value="4">4 anos</option>
                    <option value="6">6 anos</option>
                    <option value="8">8 anos</option>
                    <option value="10">10 anos</option>
                    <option value="12">12 anos</option>
                    <option value="14">14 anos</option>
                  </optgroup>
                  <optgroup label="Calçados (Adulto)">
                    <option value="33">33</option>
                    <option value="34">34</option>
                    <option value="35">35</option>
                    <option value="36">36</option>
                    <option value="37">37</option>
                    <option value="38">38</option>
                    <option value="39">39</option>
                    <option value="40">40</option>
                    <option value="41">41</option>
                    <option value="42">42</option>
                    <option value="43">43</option>
                    <option value="44">44</option>
                  </optgroup>
                  <optgroup label="Calçados (Infantil)">
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                    <option value="23">23</option>
                    <option value="24">24</option>
                    <option value="25">25</option>
                    <option value="26">26</option>
                    <option value="27">27</option>
                    <option value="28">28</option>
                    <option value="29">29</option>
                    <option value="30">30</option>
                    <option value="31">31</option>
                    <option value="32">32</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Subcategoria (Roupas)</label>
                <select
                  name="subcategory"
                  defaultValue={product.subcategory || "geral"}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
                >
                  <option value="geral">Geral / Outros</option>
                  <option value="casacos">Casacos</option>
                  <option value="blazers">Blazers</option>
                  <option value="camisetas">Camisetas e tops</option>
                  <option value="coletes">Coletes</option>
                  <option value="jaquetas">Jaquetas</option>
                  <option value="saias">Saias</option>
                  <option value="jeans">Jeans</option>
                  <option value="calcas">Calças</option>
                  <option value="moletons">Moletons</option>
                  <option value="sueteres">Suéteres e cardigãs</option>
                  <option value="shorts">Shorts</option>
                  <option value="vestidos">Vestidos e macacões</option>
                  <option value="pijamas">Pijamas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Preço (R$) *</label>
                <PriceInput initialValue={Number(product.price)} />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Estoque (Qtd) *</label>
                <input
                  type="number"
                  name="stock"
                  defaultValue={product.stock}
                  min={0}
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Descrição</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={product.description || ""}
                placeholder="Detalhes da peça..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-xs text-neutral-900 focus:border-pink-600 focus:bg-white outline-none resize-none transition-all"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase">Adicionar Novas Fotos (Opcional)</label>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-600 cursor-pointer pt-1"
              />
            </div>

            <ConfirmButton
              title="Salvar alterações"
              message="Confirma salvar essas alterações na peça?"
              confirmLabel="Salvar"
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md shadow-pink-600/20 cursor-pointer text-xs uppercase tracking-wider"
            >
              Salvar Alterações
            </ConfirmButton>
          </form>

          {/* Seção de Fotos Atuais (Separada do formulário principal para evitar o erro de HTML) */}
          {images.length > 0 && (
            <div className="pt-4 border-t border-neutral-200">
              <label className="block text-xs font-bold text-neutral-600 mb-2 uppercase">Fotos Atuais Cadastradas</label>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img) => (
                  <div key={img.id} className="w-24 flex-shrink-0 space-y-1.5">
                    <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 bg-neutral-100 relative ${img.isMain ? 'border-pink-600' : 'border-neutral-200'}`}>
                      <img src={img.url} alt="Foto do produto" className="w-full h-full object-cover" />
                      {img.isMain === 1 && (
                        <span className="absolute top-1 left-1 bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Capa
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {img.isMain !== 1 && (
                        <form action={async () => {
                          'use server';
                          await setMainImageAction(img.id, product.id);
                        }}>
                          <button
                            type="submit"
                            className="w-full text-[9px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200 rounded-lg py-1 cursor-pointer transition-all font-semibold"
                          >
                            Definir capa
                          </button>
                        </form>
                      )}

                      <form action={async () => {
                        'use server';
                        await deleteProductImageAction(img.id, product.id);
                      }}>
                        <ConfirmButton
                          variant="danger"
                          title="Excluir foto"
                          message="Excluir esta foto? Essa ação não pode ser desfeita."
                          confirmLabel="Excluir"
                          className="w-full text-[9px] bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg py-1 cursor-pointer transition-all font-semibold"
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
