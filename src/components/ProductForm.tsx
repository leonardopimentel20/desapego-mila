'use client';

import { useState } from 'react';
import { PriceInput } from '../app/admin/PriceInput';

interface ProductFormProps {
  action: (formData: FormData) => Promise<void>;
}

const subcategoriesMap: Record<string, { id: string; label: string }[]> = {
  roupas: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "casacos", label: "Casacos" },
    { id: "blazers", label: "Blazers" },
    { id: "camisetas", label: "Camisetas e tops" },
    { id: "coletes", label: "Coletes" },
    { id: "jaquetas", label: "Jaquetas" },
    { id: "saias", label: "Saias" },
    { id: "jeans", label: "Jeans" },
    { id: "calcas", label: "Calças" },
    { id: "moletons", label: "Moletons" },
    { id: "sueteres", label: "Suéteres e cardigãs" },
    { id: "shorts", label: "Shorts" },
    { id: "vestidos", label: "Vestidos e macacões" },
    { id: "pijamas", label: "Pijamas" },
  ],
  calcados: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "tenis", label: "Tênis" },
    { id: "sapatilhas", label: "Sapatilhas" },
    { id: "sandalias", label: "Sandálias" },
    { id: "botas", label: "Botas" },
    { id: "scarpin", label: "Scarpin" },
    { id: "rasteirinhas", label: "Rasteirinhas" },
    { id: "mocassim", label: "Mocassim" },
  ],
  acessorios: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "bolsas", label: "Bolsas e Carteiras" },
    { id: "cintos", label: "Cintos" },
    { id: "oculos", label: "Óculos" },
    { id: "bijuterias", label: "Bijuterias e Joias" },
    { id: "chapeus", label: "Chapéus e Bonés" },
  ],
  utilidades: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "decoracao", label: "Decoração" },
    { id: "cozinha", label: "Cozinha e Mesa" },
    { id: "cama-mesa-banho", label: "Cama, Mesa e Banho" },
    { id: "organizadores", label: "Organizadores" },
  ],
  brinquedos: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "jogos", label: "Jogos" },
    { id: "bonecas", label: "Bonecas e Bonecos" },
    { id: "carrinhos", label: "Carrinhos e Veículos" },
    { id: "pelucias", label: "Pelúcias" },
    { id: "educativos", label: "Educativos" },
  ],
  perfumaria: [
    { id: "todas", label: "Geral / Nenhuma" },
    { id: "perfumes", label: "Perfumes" },
    { id: "cremes", label: "Cremes e Hidratantes" },
    { id: "maquiagem", label: "Maquiagem" },
    { id: "cabelos", label: "Cuidados Capilares" },
  ],
  novidades: [
    { id: "todas", label: "Geral / Nenhuma" },
  ]
};

interface ImageItem {
  preview: string;
  base64: string;
}

export function ProductForm({ action }: ProductFormProps) {
  const [selectedCategory, setSelectedCategory] = useState("roupas");
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSubcategories = subcategoriesMap[selectedCategory] || subcategoriesMap["roupas"];

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newItems: ImageItem[] = [];

      if (selectedImages.length + files.length > 6) {
        setErrorMessage("Selecione no máximo 6 fotos.");
        e.target.value = '';
        return;
      }

      for (const file of files) {
        try {
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
            throw new Error("Cada foto deve ser JPG, PNG ou WebP e ter no máximo 10 MB.");
          }
          const base64 = await convertFileToBase64(file);
          const preview = URL.createObjectURL(file);
          newItems.push({ preview, base64 });
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível ler uma das fotos.");
        }
      }

      setSelectedImages(prev => [...prev, ...newItems]);
    }
    e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => {
      URL.revokeObjectURL(prev[indexToRemove].preview);
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formElement = e.currentTarget;
      const formData = new FormData(formElement);

      const rawPrice = String(formData.get("price") || "").trim();
      const priceText = rawPrice.replace(/[^\d,.-]/g, "");
      const cleanPrice = /^\d+(?:\.\d{1,2})?$/.test(priceText)
        ? priceText
        : priceText.replace(/\./g, "").replace(",", ".");
      if (cleanPrice) {
        formData.set("price", cleanPrice);
      }

      // Envia as imagens convertidas em Base64 de forma segura
      formData.delete("images");
      selectedImages.forEach((img) => {
        formData.append("imagesBase64", img.base64);
      });

      await action(formData);
    } catch (error: unknown) {
      const actionError = error instanceof Error ? error : null;
      // CORREÇÃO CRUCIAL: Se o erro for o redirecionamento interno do Next.js, ignore-o (pois deu tudo certo!)
      if (
        actionError?.message === "NEXT_REDIRECT" ||
        (typeof error === "object" && error !== null && "digest" in error && String(error.digest).includes("NEXT_REDIRECT")) ||
        actionError?.message.includes("NEXT_REDIRECT")
      ) {
        return;
      }

      let message = actionError?.message || "Ocorreu um erro ao cadastrar a peça.";

      if (message.includes("Unexpected end of form") || message.includes("exceeded") || message.includes("body")) {
        message = "O tamanho total das fotos enviadas ultrapassou o limite ou a conexão foi interrompida. Tente enviar fotos com menor resolução.";
      }

      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };
  return (
    <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
      <h2 className="text-lg font-bold text-neutral-900 mb-4">✨ Cadastrar Novo Garimpo</h2>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-start gap-3 shadow-xs">
          <span className="text-base">⚠️</span>
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Atenção ao preenchimento:</span>
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Título da Peça *</label>
            <input
              type="text"
              name="title"
              placeholder="Ex: Vestido Midi Vintage"
              required
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Tamanho / Numeração *</label>
            <select name="size" defaultValue="M" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none">
              <optgroup label="Tamanhos de Roupas">
                <option value="RN">RN</option>
                <option value="PP">PP</option>
                <option value="P">P</option>
                <option value="M">M</option>
                <option value="G">G</option>
                <option value="GG">GG</option>
                <option value="XG">XG</option>
                <option value="Único">Único</option>
              </optgroup>
              <optgroup label="Numeração de Calças">
                <option value="34">34</option>
                <option value="36">36</option>
                <option value="38">38</option>
                <option value="40">40</option>
                <option value="42">42</option>
                <option value="44">44</option>
                <option value="46">46</option>
              </optgroup>
              <optgroup label="Calçados">
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
              </optgroup>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Categoria / Setor *</label>
            <select
              name="categoryId"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none"
            >
              <option value="roupas">👗 Roupas</option>
              <option value="novidades">✨ Novidades</option>
              <option value="acessorios">👜 Acessórios</option>
              <option value="calcados">👠 Calçados</option>
              <option value="utilidades">🏠 Utilidades</option>
              <option value="brinquedos">🧸 Brinquedos</option>
              <option value="perfumaria">✨ Perfumaria</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Subcategoria</label>
            <select name="subcategory" defaultValue="todas" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none">
              {currentSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Público / Gênero</label>
            <select name="gender" defaultValue="todos" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none">
              <option value="todos">Unissex / Todos</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="infantil-menina">Infantil Menina</option>
              <option value="infantil-menino">Infantil Menino</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Preço (R$) *</label>
            <PriceInput />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Estoque (Qtd) *</label>
            <input
              type="number"
              name="stock"
              defaultValue={1}
              min={0}
              required
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none"
            />
          </div>
        </div>

        {/* Seção de Fotos Moderna com Pré-visualização e Botão X */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">Fotos da Peça (Múltiplas)</label>

          <label className="border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/40 hover:bg-pink-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-base group-hover:scale-110 transition-transform shadow-xs">
              📷
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-pink-700">Clique para selecionar as fotos da peça</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {selectedImages.length === 0 ? "Nenhuma foto selecionada" : `${selectedImages.length} foto(s) pronta(s) para envio`}
              </p>
              <p className="text-[10px] text-neutral-400">Até 6 fotos JPG, PNG ou WebP de 10 MB cada</p>
            </div>
            <input
              type="file"
              accept="image/*"
            multiple
              aria-label="Selecionar fotos da peça"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Grid de Pré-visualização */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative group w-24 h-24 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 shadow-xs">
                  <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors cursor-pointer"
                    title="Remover foto"
                  >
                    ✕
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 bg-neutral-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Capa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Descrição</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Detalhes da peça, tamanho, estado de conservação..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none resize-none"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-pink-300 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-pink-600/20 cursor-pointer"
        >
          {isSubmitting ? "Cadastrando garimpo..." : "Cadastrar Peça na Vitrine"}
        </button>
      </form>
    </div>
  );
}
