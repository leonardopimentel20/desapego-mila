import { getAvailableProducts } from "../db/queries";
import { SearchBox } from "../components/SearchBox";
import Link from "next/link";

interface HomeProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    size?: string;
    subcategory?: string;
    gender?: string;
    sort?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const {
    search = "",
    category = "todos",
    size = "todos",
    subcategory = "todas",
    gender = "todos",
    sort = "recentes"
  } = await searchParams;

  const products = await getAvailableProducts(search, category, size, subcategory, gender, sort);
  const novidades = products.filter(p => p.categoryId === 'novidades');

  const categories = [
    { id: "todos", label: "Todos os Garimpos" },
    { id: "roupas", label: "Roupas" },
    { id: "novidades", label: "✨ Recém Chegados" },
    { id: "acessorios", label: "Acessórios" },
    { id: "calcados", label: "Calçados" },
    { id: "utilidades", label: "Utilidades Domésticas" },
    { id: "brinquedos", label: "Brinquedos" },
    { id: "perfumaria", label: "Perfumaria" },
  ];

  const clothingSubcategories = [
    { id: "todas", label: "Ver tudo" },
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
  ];

  const footwearSubcategories = [
    { id: "todas", label: "Ver tudo calçados" },
    { id: "tenis", label: "Tênis" },
    { id: "sandalias", label: "Sandálias" },
    { id: "sapatos", label: "Sapatos & Scarpins" },
    { id: "botas", label: "Botas" },
    { id: "sapatilhas", label: "Sapatilhas & Rasteirinhas" },
    { id: "chinelos", label: "Chinelos & Slides" },
  ];

  const sizes = ["todos", "PP", "P", "M", "G", "GG", "Único", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

  const shortcutCategories = [
    { label: "Recém Chegados", cat: "novidades", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300" },
    { label: "Roupas", cat: "roupas", img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300" },
    { label: "Acessórios", cat: "acessorios", img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300" },
    { label: "Calçados", cat: "calcados", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300" },
    { label: "Utilidades", cat: "utilidades", img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300" },
    { label: "Brinquedos", cat: "brinquedos", img: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300" },
  ];

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans selection:bg-pink-600 selection:text-white pb-20">

      {/* Header Clean e Iluminado */}
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-12 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <Link href="/">
                <h1 className="text-2xl font-black tracking-tight text-pink-600 font-sans cursor-pointer">
                  Desapego da Mila
                </h1>
              </Link>
              <p className="text-xs text-neutral-500 font-medium">
                Brechó on-line selecionado com muito estilo.
              </p>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <a
                href="https://wa.me/5547996473275?text=Olá%20Mila!%20Gostaria%20de%20vender%20minhas%20peças%20para%20você."
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-pink-600 text-white px-3 py-1.5 rounded-full font-bold shadow-sm"
              >
                Vender 💰
              </a>
              <Link href="/admin" className="text-xs bg-neutral-100 border border-neutral-200 text-neutral-700 px-3 py-1.5 rounded-full font-medium">
                Admin ⚙️
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[450px]">
            <SearchBox initialValue={search} placeholder="Procurar marca, estilo, cor ou peça..." />
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/?text=Olá%20Mila!%20Gostaria%20de%20vender%20minhas%20peças%20para%20você."
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-full font-bold transition-all shadow-md shadow-pink-600/20"
            >
              Quero Vender 💰
            </a>
            <Link
              href="/admin"
              className="text-xs bg-white border border-neutral-200 text-neutral-700 px-5 py-2.5 rounded-full hover:border-pink-400 hover:text-pink-600 transition-all font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <span>Painel Admin</span> ⚙️
            </Link>
          </div>
        </div>

        <nav aria-label="Navegação Secundária" className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto pt-4 pb-1 text-xs font-semibold text-neutral-600 scrollbar-none border-t border-neutral-100 mt-3">
          <a href="/?category=novidades" className="hover:text-pink-600 transition-colors whitespace-nowrap text-pink-600 font-bold">✨ Recém Chegados</a>
          <a href="/?category=roupas" className="hover:text-pink-600 transition-colors whitespace-nowrap">👗 Roupas</a>
          <a href="/?category=acessorios" className="hover:text-pink-600 transition-colors whitespace-nowrap">👜 Acessórios</a>
          <a href="/?category=calcados" className="hover:text-pink-600 transition-colors whitespace-nowrap">👠 Calçados</a>
          <a href="/?category=utilidades" className="hover:text-pink-600 transition-colors whitespace-nowrap">🏠 Utilidades</a>
          <a href="/?category=brinquedos" className="hover:text-pink-600 transition-colors whitespace-nowrap">🧸 Brinquedos</a>
          <a href="/?category=perfumaria" className="hover:text-pink-600 transition-colors whitespace-nowrap">✨ Perfumaria</a>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 space-y-10">

        {!search && (
          <section aria-label="Atalhos rápidos" className="relative">
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x">
              {shortcutCategories.map((item, index) => (
                <a
                  key={index}
                  href={`/?category=${item.cat}`}
                  className="flex flex-col items-center gap-2.5 flex-shrink-0 group cursor-pointer snap-start"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-neutral-200 group-hover:border-pink-600 transition-all shadow-sm bg-white">
                    <img src={item.img} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-700 group-hover:text-pink-600 transition-colors text-center tracking-wide">
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          {/* Menu Lateral de Filtros Clean */}
          <aside className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-6 lg:sticky lg:top-32 shadow-sm">
            <div>
              <h3 className="text-xs font-extrabold text-neutral-900 uppercase tracking-widest mb-1">Filtrar Vitrine</h3>
              <p className="text-[11px] text-neutral-500">{products.length} peças disponíveis</p>
            </div>

            {/* Categoria */}
            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Categoria</h4>
              <ul className="space-y-1 text-xs">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <a
                      href={`/?category=${cat.id}&size=${size}&gender=${gender}`}
                      className={`block px-3 py-2 rounded-xl transition-all ${category === cat.id ? 'bg-pink-600 text-white font-bold shadow-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                    >
                      {cat.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subcategorias de Roupas */}
            {category === 'roupas' && (
              <div className="border-t border-neutral-100 pt-4 space-y-4">
                <h4 className="text-[11px] font-extrabold text-pink-600 uppercase tracking-widest">Público / Gênero</h4>

                {/* Feminino */}
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-2">
                  <a href={`/?category=roupas&gender=feminino&subcategory=todas`} className={`block text-xs font-bold uppercase tracking-wider ${gender === 'feminino' ? 'text-pink-600' : 'text-neutral-800 hover:text-pink-600'}`}>
                    👩 Feminino
                  </a>
                  <ul className="space-y-1 text-xs pl-2 border-l border-neutral-200">
                    {clothingSubcategories.map((sub) => (
                      <li key={sub.id}>
                        <a href={`/?category=roupas&gender=feminino&subcategory=${sub.id}&size=${size}`} className={`block px-2 py-1 rounded-lg transition-colors ${gender === 'feminino' && subcategory === sub.id ? 'text-pink-600 font-bold bg-pink-50' : 'text-neutral-600 hover:text-neutral-900'}`}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Masculino */}
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-2">
                  <a href={`/?category=roupas&gender=masculino&subcategory=todas`} className={`block text-xs font-bold uppercase tracking-wider ${gender === 'masculino' ? 'text-pink-600' : 'text-neutral-800 hover:text-pink-600'}`}>
                    👨 Masculino
                  </a>
                  <ul className="space-y-1 text-xs pl-2 border-l border-neutral-200">
                    {clothingSubcategories.map((sub) => (
                      <li key={sub.id}>
                        <a href={`/?category=roupas&gender=masculino&subcategory=${sub.id}&size=${size}`} className={`block px-2 py-1 rounded-lg transition-colors ${gender === 'masculino' && subcategory === sub.id ? 'text-pink-600 font-bold bg-pink-50' : 'text-neutral-600 hover:text-neutral-900'}`}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Infantil Menina */}
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-2">
                  <a href={`/?category=roupas&gender=infantil-menina&subcategory=todas`} className={`block text-xs font-bold uppercase tracking-wider ${gender === 'infantil-menina' ? 'text-pink-600' : 'text-neutral-800 hover:text-pink-600'}`}>
                    👧 Infantil (Menina)
                  </a>
                  <ul className="space-y-1 text-xs pl-2 border-l border-neutral-200">
                    {clothingSubcategories.map((sub) => (
                      <li key={sub.id}>
                        <a href={`/?category=roupas&gender=infantil-menina&subcategory=${sub.id}&size=${size}`} className={`block px-2 py-1 rounded-lg transition-colors ${gender === 'infantil-menina' && subcategory === sub.id ? 'text-pink-600 font-bold bg-pink-50' : 'text-neutral-600 hover:text-neutral-900'}`}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Infantil Menino */}
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-2">
                  <a href={`/?category=roupas&gender=infantil-menino&subcategory=todas`} className={`block text-xs font-bold uppercase tracking-wider ${gender === 'infantil-menino' ? 'text-pink-600' : 'text-neutral-800 hover:text-pink-600'}`}>
                    👦 Infantil (Menino)
                  </a>
                  <ul className="space-y-1 text-xs pl-2 border-l border-neutral-200">
                    {clothingSubcategories.map((sub) => (
                      <li key={sub.id}>
                        <a href={`/?category=roupas&gender=infantil-menino&subcategory=${sub.id}&size=${size}`} className={`block px-2 py-1 rounded-lg transition-colors ${gender === 'infantil-menino' && subcategory === sub.id ? 'text-pink-600 font-bold bg-pink-50' : 'text-neutral-600 hover:text-neutral-900'}`}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

            {/* Subcategorias de Calçados */}
            {category === 'calcados' && (
              <div className="border-t border-neutral-100 pt-4 space-y-4">
                <h4 className="text-[11px] font-extrabold text-pink-600 uppercase tracking-widest">Tipos de Calçados</h4>
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/60 space-y-1.5 text-xs">
                  {footwearSubcategories.map((sub) => (
                    <a
                      key={sub.id}
                      href={`/?category=calcados&subcategory=${sub.id}&size=${size}&gender=${gender}`}
                      className={`block px-2.5 py-1.5 rounded-xl transition-colors ${subcategory === sub.id ? 'text-pink-600 font-bold bg-pink-100/60' : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Tamanhos e Numerações */}
            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tamanhos / Numeração</h4>
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto scrollbar-none">
                {sizes.map((s) => (
                  <a
                    key={s}
                    href={`/?category=${category}&gender=${gender}&subcategory=${subcategory}&size=${s}&sort=${sort}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${size === s ? 'bg-neutral-900 text-white border-neutral-900 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                  >
                    {s === 'todos' ? 'Todos' : s}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* Coluna Direita: Vitrine */}
          <div className="lg:col-span-3 space-y-6">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-neutral-200/80 p-4 rounded-3xl shadow-xs">
              <div className="text-xs font-medium text-neutral-600 pl-2">
                Exibindo <strong className="text-pink-600">{products.length}</strong> peças disponíveis
              </div>

              <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
                <span className="text-neutral-500 font-semibold">Ordenar:</span>
                <a href={`/?category=${category}&gender=${gender}&subcategory=${subcategory}&size=${size}&sort=recentes`} className={`px-3.5 py-2 rounded-xl border transition-all ${sort === 'recentes' ? 'bg-pink-50 text-pink-600 border-pink-200 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>Recentes</a>
                <a href={`/?category=${category}&gender=${gender}&subcategory=${subcategory}&size=${size}&sort=menor`} className={`px-3.5 py-2 rounded-xl border transition-all ${sort === 'menor' ? 'bg-pink-50 text-pink-600 border-pink-200 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>Menor Preço</a>
                <a href={`/?category=${category}&gender=${gender}&subcategory=${subcategory}&size=${size}&sort=maior`} className={`px-3.5 py-2 rounded-xl border transition-all ${sort === 'maior' ? 'bg-pink-50 text-pink-600 border-pink-200 font-bold' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>Maior Preço</a>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-16 text-center space-y-3 shadow-xs">
                <p className="text-lg font-bold text-neutral-800">Nenhum garimpo encontrado</p>
                <p className="text-xs text-neutral-500">Tente buscar por outro termo ou alterar os filtros no menu lateral.</p>
                <a href="/" className="inline-block mt-2 text-xs bg-pink-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm">Limpar Filtros</a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => {
                  const stockNum = Number(product.stock) || 0;
                  const isSold = stockNum === 0 || (product.status === 'SOLD' && stockNum <= 1);
                  const isBestSeller = stockNum > 1 && product.status === 'SOLD';

                  const genderDisplay = product.gender
                    ? product.gender.replace('infantil-', 'Infantil ').replace('-', ' ')
                    : '';
                  const subcategoryDisplay = product.subcategory && product.subcategory !== 'geral'
                    ? product.subcategory
                    : '';

                  return (
                    <Link
                      key={product.id}
                      href={`/produtos/${product.id}`}
                      className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden group hover:border-pink-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between shadow-xs"
                    >
                      <div className="w-full h-72 bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <span className="text-xs text-neutral-400">Sem Foto</span>
                        )}

                        <div className="absolute top-3 right-3">
                          {isSold ? (
                            <span className="bg-neutral-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">Vendido</span>
                          ) : isBestSeller ? (
                            <span className="bg-pink-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-xs">Mais Vendido</span>
                          ) : stockNum > 1 ? (
                            <span className="bg-pink-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">Restam {stockNum} un.</span>
                          ) : null}
                        </div>

                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                          <span className="bg-white/90 backdrop-blur-md border border-neutral-200 text-pink-600 text-[10px] font-bold px-3 py-1 rounded-xl shadow-xs">
                            Tam: {product.size}
                          </span>
                          {genderDisplay && (
                            <span className="bg-white/90 backdrop-blur-md border border-neutral-200 text-neutral-600 text-[9px] font-semibold px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-xs">
                              {genderDisplay}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-3 bg-white flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-pink-600 font-bold uppercase tracking-widest mb-1.5">
                            <span>{product.categoryId}</span>
                            {subcategoryDisplay && <span>• {subcategoryDisplay}</span>}
                          </div>
                          <h3 className="font-medium text-neutral-900 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">
                            {product.title}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                          <span className="text-neutral-900 font-black text-lg">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                          </span>
                          <span className="text-[11px] text-neutral-500 bg-neutral-100 px-3 py-1 rounded-xl">
                            Estoque: {stockNum}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}

