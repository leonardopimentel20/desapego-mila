import { db } from '../src/db';
import { products, productImages } from '../src/db/schema';
import { randomUUID } from 'crypto';

async function seedMassiveDatabase() {
  console.log('🌱 Limpando dados antigos e gerando catálogo massivo...');

  // Limpa tabelas antes de popular
  await db.delete(productImages);
  await db.delete(products);

  const massiveCatalog = [
    // ==================== ROUPAS (Feminino / Masculino / Infantil) ====================
    {
      title: "Blazer Alfaiataria Vintage Xadrez Premium",
      description: "Blazer clássico em perfeito estado, forrado, tecido de alfaiataria encorpado.",
      price: "129.90",
      stock: 1,
      categoryId: "roupas",
      subcategory: "blazers",
      gender: "feminino",
      size: "M",
      images: [
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800"
      ]
    },
    {
      title: "Casaco de Lã Batida Longo Inverno",
      description: "Casaco elegante para dias frios, com gola estruturada e bolsos.",
      price: "189.00",
      stock: 2,
      categoryId: "roupas",
      subcategory: "casacos",
      gender: "feminino",
      size: "G",
      images: [
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800"
      ]
    },
    {
      title: "Jaqueta Jeans Oversized Estonada",
      description: "Jaqueta clássica com lavagem média e ótimo caimento.",
      price: "110.00",
      stock: 1,
      categoryId: "roupas",
      subcategory: "jaquetas",
      gender: "feminino",
      size: "GG",
      images: [
        "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800",
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800",
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800"
      ]
    },
    {
      title: "Vestido Midi Floral Romântico de Verão",
      description: "Vestido leve, fluido, com elástico na cintura e estampa exclusiva.",
      price: "89.90",
      stock: 1,
      categoryId: "roupas",
      subcategory: "vestidos",
      gender: "feminino",
      size: "P",
      images: [
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800",
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800"
      ]
    },
    {
      title: "Calça Jeans Reta Cintura Alta 100% Algodão",
      description: "Jeans vintage autêntico, sem elastano, lavagem clássica.",
      price: "95.00",
      stock: 1,
      categoryId: "roupas",
      subcategory: "jeans",
      gender: "feminino",
      size: "38",
      images: [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800",
        "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800"
      ]
    },
    {
      title: "Moletom Canguru Masculino Felpudo Preto",
      description: "Moletom flanelado por dentro, super confortável e quente.",
      price: "79.90",
      stock: 3,
      categoryId: "roupas",
      subcategory: "moletons",
      gender: "masculino",
      size: "M",
      images: [
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800"
      ]
    },
    {
      title: "Conjunto Pijama Infantil Flanelado Dinossauros",
      description: "Pijama quentinho de duas peças para os pequenos.",
      price: "45.00",
      stock: 2,
      categoryId: "roupas",
      subcategory: "pijamas",
      gender: "infantil-menino",
      size: "3 Anos",
      images: [
        "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800",
        "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800"
      ]
    },
    {
      title: "Vestidinho Infantil Festa Tricô Rosa",
      description: "Vestido delicado com detalhes em relevo.",
      price: "59.90",
      stock: 1,
      categoryId: "roupas",
      subcategory: "vestidos",
      gender: "infantil-menina",
      size: "2 Anos",
      images: [
        "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800"
      ]
    },
    {
      title: "Camisa Social Masculina Slim Fit Azul",
      description: "Camisa em algodão egípcio, ideal para trabalho ou eventos.",
      price: "69.00",
      stock: 2,
      categoryId: "roupas",
      subcategory: "camisetas",
      gender: "masculino",
      size: "G",
      images: [
        "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800"
      ]
    },
    {
      title: "Shorts Jeans Destroyed Cintura Alta",
      description: "Shorts desfiado com excelente caimento no corpo.",
      price: "55.00",
      stock: 1,
      categoryId: "roupas",
      subcategory: "shorts",
      gender: "feminino",
      size: "36",
      images: [
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800"
      ]
    },

    // ==================== CALÇADOS (Adulto e Infantil) ====================
    {
      title: "Tênis Casual Retrô Couro Branco",
      description: "Tênis confortável para todas as ocasiões, solado emborrachado.",
      price: "149.90",
      stock: 1,
      categoryId: "calcados",
      subcategory: "tenis",
      gender: "feminino",
      size: "37",
      images: [
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800",
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
        "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=800"
      ]
    },
    {
      title: "Bota Anabela de Couro Cano Curto",
      description: "Bota legítima confortável com salto bloco estável.",
      price: "160.00",
      stock: 1,
      categoryId: "calcados",
      subcategory: "botas",
      gender: "feminino",
      size: "36",
      images: [
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800"
      ]
    },
    {
      title: "Sandália Infantil Glitter com Laço",
      description: "Sandália confortável com fechamento em velcro para os pezinhos.",
      price: "55.00",
      stock: 1,
      categoryId: "calcados",
      subcategory: "sandalias",
      gender: "infantil-menina",
      size: "24",
      images: [
        "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=800"
      ]
    },
    {
      title: "Tênis Esportivo Infantil Luzinha Led",
      description: "Tênis anatômico que acende ao caminhar.",
      price: "79.90",
      stock: 2,
      categoryId: "calcados",
      subcategory: "tenis",
      gender: "infantil-menino",
      size: "28",
      images: [
        "https://images.unsplash.com/photo-1514989940723-e8e5af635c16?w=800"
      ]
    },
    {
      title: "Scarpin Clássico Vermelho Verniz",
      description: "Salto alto elegante para festas e eventos formais.",
      price: "119.90",
      stock: 1,
      categoryId: "calcados",
      subcategory: "scarpin",
      gender: "feminino",
      size: "35",
      images: [
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800"
      ]
    },
    {
      title: "Mocassim Masculino em Couro Legítimo",
      description: "Calçado social confortável sem cadarço.",
      price: "135.00",
      stock: 1,
      categoryId: "calcados",
      subcategory: "mocassim",
      gender: "masculino",
      size: "41",
      images: [
        "https://images.unsplash.com/photo-1533867617858-e7d97e0afd8b?w=800"
      ]
    },

    // ==================== ACESSÓRIOS ====================
    {
      title: "Bolsa Baú Vintage em Couro Caramelo",
      description: "Bolsa estruturada clássica com alça transversal regulável.",
      price: "140.00",
      stock: 1,
      categoryId: "acessorios",
      subcategory: "bolsas",
      gender: "feminino",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800"
      ]
    },
    {
      title: "Óculos de Sol Gatinho Proteção UV400",
      description: "Armação elegante estilo retrô com lentes escuras.",
      price: "65.00",
      stock: 2,
      categoryId: "acessorios",
      subcategory: "oculos",
      gender: "feminino",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800"
      ]
    },
    {
      title: "Cinto de Couro com Fivela Dourada",
      description: "Acessório coringa para acinturar vestidos e calças.",
      price: "45.00",
      stock: 3,
      categoryId: "acessorios",
      subcategory: "cintos",
      gender: "feminino",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800"
      ]
    },
    {
      title: "Colar Ponto de Luz Banhado a Ouro",
      description: "Bijuteria fina de alta qualidade com zirconia.",
      price: "39.90",
      stock: 2,
      categoryId: "acessorios",
      subcategory: "bijuterias",
      gender: "feminino",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800"
      ]
    },

    // ==================== UTILIDADES ====================
    {
      title: "Conjunto de Xícaras de Chá Cerâmica Artesanal",
      description: "Kit com 4 xícaras e pires pintados à mão.",
      price: "90.00",
      stock: 1,
      categoryId: "utilidades",
      subcategory: "cozinha",
      gender: "todos",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
        "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800"
      ]
    },
    {
      title: "Vaso Decorativo de Cerâmica Minimalista",
      description: "Peça perfeita para decoração de salas e estantes.",
      price: "65.00",
      stock: 1,
      categoryId: "utilidades",
      subcategory: "decoracao",
      gender: "todos",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1581783342677-2e52f085732e?w=800"
      ]
    },

    // ==================== BRINQUEDOS ====================
    {
      title: "Jogo de Tabuleiro Clássico de Estratégia",
      description: "Completo com todas as peças originais e manual.",
      price: "50.00",
      stock: 1,
      categoryId: "brinquedos",
      subcategory: "jogos",
      gender: "todos",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800",
        "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800"
      ]
    },
    {
      title: "Ursinho de Pelúcia Gigante Antialérgico",
      description: "Pelúcia super macia, higienizada e em ótimo estado.",
      price: "85.00",
      stock: 1,
      categoryId: "brinquedos",
      subcategory: "pelucias",
      gender: "todos",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800"
      ]
    },

    // ==================== PERFUMARIA ====================
    {
      title: "Perfume Importado Desapego Original (50ml)",
      description: "Frasco com 80% do conteúdo original restante.",
      price: "120.00",
      stock: 1,
      categoryId: "perfumaria",
      subcategory: "perfumes",
      gender: "feminino",
      size: "Único",
      images: [
        "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800",
        "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800"
      ]
    }
  ];

  for (const item of massiveCatalog) {
    const productId = randomUUID();
    const baseSlug = item.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    
    const slug = `${baseSlug}-${productId.slice(0, 5)}`;

    // Insere o produto
    await db.insert(products).values({
      id: productId,
      title: item.title,
      slug: slug,
      description: item.description,
      price: item.price,
      stock: item.stock,
      categoryId: item.categoryId,
      subcategory: item.subcategory,
      gender: item.gender,
      size: item.size,
      status: "AVAILABLE",
    });

    // Insere todas as fotos do produto (com múltiplas fotos por item)
    for (let i = 0; i < item.images.length; i++) {
      await db.insert(productImages).values({
        id: randomUUID(),
        url: item.images[i],
        isMain: i === 0 ? 1 : 0, // A primeira foto é a principal
        productId: productId,
      });
    }
  }

  console.log(`✨ Sucesso! ${massiveCatalog.length} garimpos com múltiplas fotos foram injetados no banco.`);
  process.exit(0);
}

seedMassiveDatabase().catch((err) => {
  console.error('❌ Erro ao popular banco de dados:', err);
  process.exit(1);
});