import { getProductBySlug } from "../../../db/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { ProductGallery } from "../../../components/ProductGallery";
import { AddToCartButton } from "../../../components/AddToCartButton";
import { CartButton } from "../../../components/CartButton";
import { CartDrawer } from "../../../components/CartDrawer";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produto não encontrado | Desapego da Mila",
    };
  }

  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800";
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price));

  return {
    title: `${product.title} - ${formattedPrice} | Desapego da Mila`,
    description: product.description || `Garimpe esta peça exclusiva no Desapego da Mila por ${formattedPrice}.`,
    openGraph: {
      title: `${product.title} - ${formattedPrice}`,
      description: product.description || `Garimpe esta peça exclusiva no Desapego da Mila.`,
      images: [
        {
          url: mainImage,
          width: 800,
          height: 800,
          alt: product.title,
        },
      ],
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const stockNum = Number(product.stock) || 0;
  const isSold = stockNum === 0 || product.status === 'SOLD';
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price));

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans selection:bg-pink-600 selection:text-white pb-20">
      {/* Drawer Lateral da Sacola */}
      <CartDrawer />

      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-12 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-pink-600 font-sans cursor-pointer">
              Desapego da Mila
            </h1>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-neutral-700 bg-white border border-neutral-200 px-4 py-2 rounded-full hover:border-pink-500 hover:text-pink-600 transition-all font-semibold shadow-xs"
            >
              ← Voltar para a Vitrine
            </Link>
            <CartButton />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-12 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

          <ProductGallery images={product.images} title={product.title} />

          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-pink-600 font-bold uppercase tracking-widest mb-2">
                <span>{product.categoryId}</span>
                {product.subcategory && product.subcategory !== 'geral' && <span>• {product.subcategory}</span>}
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{product.title}</h2>
            </div>

            <div className="flex items-center justify-between border-y border-neutral-100 py-4">
              <span className="text-3xl font-black text-neutral-900">{formattedPrice}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-pink-50 text-pink-600 border border-pink-100">
                Tamanho: {product.size}
              </span>
            </div>

            {product.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sobre o Garimpo</h4>
                <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              {/* Verificação de status para o botão de compra */}
              {product.status === 'RESERVED' ? (
                <div className="w-full bg-amber-500 text-white font-bold py-3.5 px-6 rounded-2xl text-center text-xs uppercase tracking-wider">
                  Item Reservado ⏳
                </div>
              ) : product.status === 'SOLD' || isSold ? (
                <div className="w-full bg-neutral-900 text-white font-bold py-3.5 px-6 rounded-2xl text-center text-xs uppercase tracking-wider">
                  Item Vendido ❌
                </div>
              ) : (
                <AddToCartButton
                  product={{
                    id: product.id,
                    title: product.title,
                    price: Number(product.price),
                    size: product.size,
                    imageUrl: product.images?.[0] || null,
                    slug: product.slug,
                    stock: stockNum,
                  }}
                  isSold={isSold}
                />
              )}
              <p className="text-[11px] text-neutral-400 text-center">
                🚚 Envio unificado: adicione várias peças à sacola e finalize o pedido de uma vez só com a Mila via WhatsApp.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
