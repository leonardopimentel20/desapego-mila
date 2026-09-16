# Desapego da Mila

Aplicação web de brechó para divulgação, reserva e administração de produtos. A vitrine permite pesquisar e filtrar peças, consultar detalhes, montar uma sacola e registrar uma reserva antes de encaminhar o atendimento para o WhatsApp. O painel administrativo concentra cadastro, edição, controle de estoque, reservas e vendas.

Versão atual: **1.0.0**.

## Tecnologias

- Next.js 16 com App Router, Turbopack e Server Actions
- React 19 e TypeScript
- Tailwind CSS 4
- MySQL com Drizzle ORM
- Zod para validação no servidor
- Cloudinary para armazenamento das imagens
- Playwright para testes de navegação e segurança

## Estrutura do projeto

```text
src/
├── app/
│   ├── admin/
│   │   ├── actions.ts          # Mutações administrativas e reservas
│   │   ├── login/              # Login do painel
│   │   └── edit/[id]/          # Edição de produto e gerenciamento de fotos
│   ├── api/suggestions/        # Sugestões da busca
│   ├── produtos/[slug]/        # Detalhes de um produto
│   ├── layout.tsx              # Layout, fontes e metadados globais
│   └── page.tsx                # Vitrine, filtros e listagem de produtos
├── components/                 # Formulários e componentes interativos
├── context/CartContext.tsx     # Estado da sacola e persistência local
├── db/
│   ├── index.ts                # Conexão MySQL/Drizzle
│   ├── queries.ts              # Consultas da vitrine e detalhes
│   ├── schema.ts               # Representação das tabelas existentes
│   └── validator.ts            # Regras Zod dos produtos
├── lib/admin-auth.ts           # Criação e validação da sessão administrativa
└── proxy.ts                    # Proteção das rotas /admin no Next.js 16

tests/                          # Testes Playwright da vitrine e autenticação
drizzle.config.ts               # Configuração do Drizzle Kit
next.config.ts                  # Configuração do Next.js e Server Actions
```

## Fluxos principais

### Vitrine e busca

A página inicial consulta produtos com estoque maior que zero que ainda não estejam vendidos. Itens `RESERVED` continuam visíveis com o destaque **Reservado · Em alta procura**, mas não podem ser adicionados novamente à sacola. A busca, os filtros e a rota de sugestões trabalham sobre os dados do banco por meio do Drizzle ORM. Os filtros disponíveis incluem categoria, subcategoria, público, tamanho e ordenação.

### Sacola e reserva

A sacola é mantida no `localStorage` do navegador. Ao finalizar:

1. nome, telefone, IDs e quantidades dos produtos são validados no servidor;
2. uma transação bloqueia os registros selecionados;
3. todos os produtos precisam continuar disponíveis e ter estoque suficiente para a quantidade pedida;
4. os itens e suas quantidades são marcados como `RESERVED` de uma só vez;
5. somente após a confirmação do banco o atendimento é aberto no WhatsApp.

Se algum item não estiver mais disponível, nada é reservado e a sacola permanece aberta com a mensagem de erro.

### Administração

As páginas em `/admin` exigem um cookie de sessão válido. O Proxy protege a navegação e cada Server Action também verifica a sessão, pois Actions podem ser chamadas diretamente por requisições HTTP.

O painel permite:

- cadastrar e editar produtos;
- adicionar, excluir e definir a imagem principal;
- controlar disponibilidade e estoque;
- visualizar e agrupar reservas por cliente;
- registrar vendas;
- excluir produtos.

As operações que alteram vários registros usam transações para evitar estados parciais. A baixa de estoque e a reserva também bloqueiam o produto durante a operação para reduzir conflitos entre requisições simultâneas.

No catálogo geral, **Marcar Vendido** registra a venda de uma unidade. Quando ainda restam unidades, o produto continua disponível com o estoque reduzido; quando o estoque chega a zero, muda para `SOLD`. Nesse caso, **Marcar Disponível** desfaz a última baixa e restaura uma unidade. Para um produto reservado, o botão de venda informa a quantidade reservada e baixa exatamente esse total. Na área de reservas, **Liberar** devolve todas as unidades reservadas para a vitrine sem alterar o estoque.

### Estados do produto

- `AVAILABLE`: aparece na vitrine quando possui estoque.
- `RESERVED`: continua na vitrine com destaque de alta procura, mas fica bloqueado para uma nova reserva.
- `SOLD`: produto vendido ou sem estoque, removido da vitrine.

## Segurança e validação

- Não existem credenciais administrativas padrão.
- `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` são obrigatórios.
- O cookie administrativo é `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- A sessão é validada no Proxy e novamente dentro das Server Actions administrativas.
- IDs recebidos pelas Actions precisam ser UUIDs válidos.
- Título, descrição, preço, estoque, categoria, tamanho, subcategoria e público são validados com Zod.
- Dados de reserva possuem limites de tamanho e formato.
- O Proxy e as Server Actions aceitam corpos de até 85 MB para comportar as imagens convertidas em Base64; as Actions aceitam somente a origem adicional explicitamente configurada.
- Mensagens internas do Cloudinary não são devolvidas diretamente ao navegador.

## Upload de imagens

O cadastro aceita até seis imagens por envio. Cada arquivo precisa ser JPG, PNG ou WebP e ter no máximo 10 MB. Essas regras são verificadas no navegador para retorno rápido e novamente no servidor, que é a validação efetiva de segurança. O limite total da Server Action considera o aumento causado pela conversão das imagens para Base64.

As imagens são enviadas para a pasta `desapego-mila` no Cloudinary. O banco armazena a URL segura retornada pelo serviço e identifica qual imagem é a capa.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz. Ele é ignorado pelo Git e não deve ser publicado.

```dotenv
DATABASE_URL=mysql://usuario:senha@host:3306/banco
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nome_da_cloud
CLOUDINARY_API_KEY=chave_da_api
CLOUDINARY_API_SECRET=segredo_da_api
ADMIN_PASSWORD=senha_administrativa_forte
ADMIN_SESSION_SECRET=segredo_longo_e_aleatorio
```

Use valores diferentes entre desenvolvimento e produção. Alterar `ADMIN_PASSWORD` ou `ADMIN_SESSION_SECRET` invalida as sessões administrativas anteriores.

## Execução local

Requisitos:

- Node.js compatível com Next.js 16;
- banco MySQL acessível e com as tabelas descritas em `src/db/schema.ts`;
- conta e credenciais do Cloudinary para usar uploads.

Instale as dependências e inicie o servidor:

```bash
npm install
npm run db:migrate:reservation
npm run dev
```

A migração `db:migrate:reservation` adiciona, de forma idempotente, a coluna `reserved_quantity` usada para registrar quantas unidades cada cliente reservou. Execute-a uma vez em cada banco antes de publicar esta versão.

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000). O painel está em [http://localhost:3000/admin](http://localhost:3000/admin).

## Verificações

```bash
npm run typecheck  # valida os tipos TypeScript
npm run lint       # executa o ESLint
npm test           # executa os testes Playwright
npm run build      # gera o build de produção
```

Os testes Playwright iniciam o servidor automaticamente e carregam as variáveis do `.env`. Atualmente cobrem navegação da vitrine, proteção da área administrativa, login, atributos de segurança do cookie e rejeição de cookie falsificado.

## Produção

Antes de publicar:

1. configure todas as variáveis de ambiente na plataforma de hospedagem;
2. use uma senha administrativa forte e um segredo de sessão longo e aleatório;
3. confirme a conectividade com MySQL e Cloudinary;
4. execute `npm run db:migrate:reservation` no banco da aplicação;
5. execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`;
6. inicie o build gerado com `npm start` quando a hospedagem não gerenciar o Next.js automaticamente.

O endereço ngrok em `next.config.ts` existe para o ambiente atual de desenvolvimento. Antes de usar outro túnel, troque a origem explícita; não adicione curingas às origens permitidas das Server Actions em produção.

## Limitações conhecidas

- A exclusão de uma imagem ou produto remove o registro do banco, mas ainda não apaga o arquivo correspondente no Cloudinary.
- Algumas imagens usam `<img>` diretamente. A migração para `next/image` depende da configuração segura dos hosts do Cloudinary e das imagens externas.
- A proteção contra tentativas repetidas de login deve ser aplicada pela infraestrutura de produção ou por um armazenamento compartilhado apropriado para rate limiting.
- A auditoria do npm aponta vulnerabilidades moderadas na cadeia de desenvolvimento do `drizzle-kit`/`esbuild`. A correção automática disponível exige um downgrade incompatível e deve ser reavaliada quando houver uma versão segura compatível.
