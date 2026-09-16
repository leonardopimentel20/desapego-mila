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

export function ProductForm({ action }: ProductFormProps) {
  const [selectedCategory, setSelectedCategory] = useState("roupas");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const currentSubcategories = subcategoriesMap[selectedCategory] || subcategoriesMap["roupas"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    // Substitui os arquivos do input nativo pelos arquivos filtrados no state
    formData.delete("images");
    selectedFiles.forEach(file => {
      formData.append("images", file);
    });

    await action(formData);
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
      <h2 className="text-lg font-bold text-neutral-900 mb-4">✨ Cadastrar Novo Garimpo</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Título da Peça *</label>
            <input type="text" name="title" required placeholder="Ex: Vestido Midi Vintage" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none" />
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
            <input type="number" name="stock" defaultValue={1} min={1} required className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none" />
          </div>
        </div>

        {/* Seção de Fotos com Preview e Exclusão */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-neutral-700 uppercase">Fotos da Peça (Múltiplas)</label>
          
          <div className="flex items-center gap-3">
            <label className="bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all inline-flex items-center gap-2">
              <span>📷 Escolher Fotos</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
            <span className="text-xs text-neutral-400">
              {selectedFiles.length === 0 ? "Nenhuma foto selecionada" : `${selectedFiles.length} foto(s) selecionada(s)`}
            </span>
          </div>

          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {selectedFiles.map((file, index) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <div key={index} className="relative group w-24 h-24 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 shadow-xs">
                    <img src={previewUrl} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors cursor-pointer"
                      title="Excluir foto"
                    >
                      ✕
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 bg-neutral-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Capa
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase">Descrição</label>
          <textarea name="description" rows={3} placeholder="Detalhes da peça, tamanho, estado de conservação..." className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:border-pink-600 outline-none resize-none"></textarea>
        </div>

        <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-pink-600/20 cursor-pointer">
          Cadastrar Peça na Vitrine
        </button>
      </form>
    </div>
  );
}