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
src/whatsapp/
├── bot.ts                      # Conexão Baileys, QR, reconexão e mensagens
├── config.ts                   # Pasta de sessão, porta e URL da vitrine
├── menu.ts                     # Respostas automáticas do atendimento
└── index.ts                    # Health check Express e inicialização do bot

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
WHATSAPP_BOT_PORT=3001
WHATSAPP_AUTH_FOLDER=./auth_info_baileys
WHATSAPP_LOG_LEVEL=info
WHATSAPP_EXPECTED_NUMBER=47996473275
WHATSAPP_OWNER_PHONE=5511999999999
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
npm run db:migrate:reservations
npm run dev
```

As migrações são idempotentes. `db:migrate:reservation` adiciona a coluna `reserved_quantity`; `db:migrate:reservations` cria as tabelas de reservas e itens. Execute ambas uma vez em cada banco antes de publicar esta versão.

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000). O painel está em [http://localhost:3000/admin](http://localhost:3000/admin).

## Bot de atendimento via WhatsApp

O projeto inclui um bot separado usando `@whiskeysockets/baileys`. Ele mantém a sessão em `auth_info_baileys`, exibe o QR Code no terminal somente quando necessário e responde mensagens privadas com um menu básico:

- `1`: link da vitrine;
- `2`: orientação para fazer uma reserva;
- `3`: orientação para vender peças;
- `4`: encaminhamento para atendimento manual.

Depois de escolher `2` ou `3`, a próxima mensagem é recebida como os dados da reserva
ou da peça para venda. Esse estado fica associado ao número por 30 minutos; a pessoa pode
digitar `menu` a qualquer momento para voltar ao início. O bot não usa treinamento de IA:
o fluxo é determinístico e não cria a reserva automaticamente no banco.

Quando a reserva é iniciada pela sacola da vitrine, a mensagem enviada ao WhatsApp inclui
um código único. O bot reconhece esse código, pergunta se a cliente prefere retirada ou
motoboy e registra a escolha na mesma reserva. Para motoboy, ele solicita bairro e cidade
apenas para registro e aplica a taxa fixa de R$ 30,00 para a cidade inteira.

O serviço do bot precisa ter a mesma variável `DATABASE_URL` do serviço web para consultar
e atualizar as reservas. As migrações de entrega são executadas pelo `npm start`:
`db:migrate:delivery`.

O painel administrativo também permite pausar e reativar o atendimento automático. Pausar
não desconecta o WhatsApp nem apaga a sessão: apenas impede novas respostas até a reativação.
A opção de desconectar encerra a sessão atual e, ao reativar o serviço, será necessário
parear novamente o número por QR Code.

Para continuar o atendimento até o pagamento, configure no serviço do bot:

```env
PIX_KEY=sua-chave-pix
PIX_KEY_TYPE=tipo-da-chave
PIX_NAME=Desapego da Mila
PIX_CITY=sua-cidade
```

Depois de registrar a retirada ou a entrega, o bot informa o total atualizado, envia a
chave Pix, pede a confirmação do pagamento e aguarda o comprovante. O comprovante não
confirma a venda automaticamente: a Mila ainda precisa validar o pagamento e confirmar a
reserva no painel.

Para iniciar localmente:

```bash
npm run whatsapp
```

Na primeira execução, abra o WhatsApp no celular em **Configurações → Dispositivos conectados → Conectar dispositivo** e escaneie o QR Code exibido no terminal. Nas próximas reinicializações, a sessão será carregada da pasta configurada em `WHATSAPP_AUTH_FOLDER`. `WHATSAPP_EXPECTED_NUMBER` é opcional e apenas alerta nos logs se outro número for pareado; ele não substitui o escaneamento do QR Code. O número efetivamente conectado aparece no painel administrativo.

`WHATSAPP_OWNER_PHONE` é o número, com código do país e somente dígitos, que receberá alertas quando um cliente escolher **Falar com a Mila**. O cliente fica em atendimento humano até enviar `menu`. Nunca coloque esse número no código-fonte; configure-o apenas como variável privada do serviço WhatsApp.

O health check do serviço fica em [http://localhost:3001/health](http://localhost:3001/health). Mensagens de grupos, status e mensagens enviadas pelo próprio bot são ignoradas. Em produção, defina
`NEXT_PUBLIC_APP_URL` com a URL pública da vitrine; sem essa variável, o bot usa
`https://desapego-mila-production.up.railway.app` como padrão.
Informe somente a origem pública, sem `/admin`, `/login` ou outro caminho; o bot
normaliza a variável para a raiz da vitrine.

### Hospedagem do bot

O bot deve rodar como um serviço separado do Next.js, por exemplo com o comando `npm run whatsapp`. A pasta `auth_info_baileys` precisa estar em um volume persistente; sem isso, o QR Code será solicitado novamente após cada deploy. Não coloque essa pasta no Git nem em logs.

Essa integração usa uma sessão do WhatsApp Web via Baileys, não a WhatsApp Cloud API oficial. Use um número dedicado, mantenha o bot com respostas moderadas e revise os termos e limites aplicáveis ao WhatsApp antes de usá-lo em produção.

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
4. execute `npm run db:migrate:reservation` e `npm run db:migrate:reservations` no banco da aplicação;
5. execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`;
6. inicie o build gerado com `npm start` quando a hospedagem não gerenciar o Next.js automaticamente.

### Deploy no Railway

O projeto pode ser publicado diretamente a partir do repositório GitHub:

1. crie um novo projeto no Railway e selecione **Deploy from GitHub repo**;
2. adicione um serviço **MySQL** ao mesmo projeto Railway ou use um MySQL externo;
3. no serviço da aplicação, crie a variável `DATABASE_URL` com a URL do banco;
4. configure as demais variáveis da seção anterior no serviço web;
5. configure o domínio público em **Settings > Networking > Generate Domain**.

Quando o MySQL for provisionado pelo próprio Railway, a variável normalmente pode ser vinculada
com a referência entre serviços `\${{MySQL.MYSQL_URL}}` (ajuste `MySQL` para o nome exato do
serviço). Se usar um banco externo, cole a URL completa no formato
`mysql://usuario:senha@host:3306/nome_do_banco`.

O arquivo `railway.toml` já define `npm start` como comando de inicialização e `/api/health`
como health check. O comando `npm start` executa as três migrações idempotentes antes de iniciar
o Next.js, e o Railway fornece a porta por meio da variável `PORT`.

Para configurar localmente, copie `.env.example` para `.env` e substitua todos os valores de
exemplo. Nunca publique `.env` nem coloque senhas no `railway.toml`.

### WhatsApp: situação atual e próximos passos

Hoje o checkout registra a reserva no banco e abre uma conversa com uma mensagem preenchida
por meio de um link `wa.me`. Isso não exige API, token ou aprovação da Meta e é a melhor opção
para começar com baixo custo: a Mila confirma o atendimento manualmente no WhatsApp.

Se a necessidade for um **chat automatizado** (respostas, status da reserva, confirmação e
notificações), a recomendação é usar a **WhatsApp Business Platform Cloud API da Meta**.
Ela exige um Business Manager, um número dedicado, um token permanente e um endpoint HTTPS
de webhook. Nesse cenário, o Railway hospeda as rotas da API e o webhook, enquanto o Cloudinary
continua armazenando as imagens.

Não é recomendado automatizar o WhatsApp Web com bibliotecas que controlam QR Code ou navegador:
isso é frágil, pode desconectar e pode levar ao bloqueio do número. Provedores como Twilio ou
360dialog simplificam a operação, mas adicionam custo e uma camada intermediária.

Uma evolução segura do projeto seria:

1. manter o link `wa.me` como fallback;
2. criar uma rota `POST /api/whatsapp/webhook` para validar o desafio da Meta e receber eventos;
3. criar um módulo de servidor para enviar mensagens pela Cloud API sem expor o token;
4. enviar a confirmação da reserva somente depois da transação do banco;
5. persistir o `message_id` e o status de entrega no banco.

As credenciais da Meta devem ficar somente nas variáveis de ambiente do Railway, nunca no
navegador ou no repositório.

O endereço ngrok em `next.config.ts` existe para o ambiente atual de desenvolvimento. Antes de usar outro túnel, troque a origem explícita; não adicione curingas às origens permitidas das Server Actions em produção.

## Limitações conhecidas

- A exclusão de uma imagem ou produto remove o registro do banco, mas ainda não apaga o arquivo correspondente no Cloudinary.
- Algumas imagens usam `<img>` diretamente. A migração para `next/image` depende da configuração segura dos hosts do Cloudinary e das imagens externas.
- A proteção contra tentativas repetidas de login deve ser aplicada pela infraestrutura de produção ou por um armazenamento compartilhado apropriado para rate limiting.
- A auditoria do npm aponta vulnerabilidades moderadas na cadeia de desenvolvimento do `drizzle-kit`/`esbuild`. A correção automática disponível exige um downgrade incompatível e deve ser reavaliada quando houver uma versão segura compatível.
