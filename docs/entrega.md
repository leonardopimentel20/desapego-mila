# Dados e etiqueta de entrega

Ao escolher motoboy, o cliente informa bairro/cidade, destinatário, rua, número,
telefone com DDD, complemento e referência. Os dois últimos podem ser pulados.
O bot exibe um resumo e permite confirmar ou refazer os dados. Somente a
confirmação grava a entrega e libera a mensagem de pagamento, mantendo a taxa
de R$ 30,00 e a conferência manual do Pix pela Mila.

No painel, abra a reserva e clique em **Ver / imprimir etiqueta de entrega**.
A etiqueta inclui o ID completo da reserva (o mesmo identificador da compra),
destinatário, telefone e endereço. A página usa a proteção administrativa
existente. Reservas antigas sem endereço completo exibem um aviso e não
oferecem o botão de impressão; reservas canceladas ou de retirada não geram
etiqueta de entrega.

## Atualização

Antes de colocar o código atualizado em uso, execute no ambiente da aplicação:

```sh
npm run db:migrate:delivery
```

A migração apenas acrescenta colunas opcionais e pode ser repetida. Não remove
reservas nem modifica valores já registrados. `npm start` e `npm run whatsapp`
já executam essa migração; `npm run dev` não a executa. Publique/reinicie o site
e o serviço do WhatsApp após a atualização. Use a mesma base nos dois serviços.

Como no fluxo existente, as conversas em andamento ficam em memória por 30
minutos. Após expiração ou reinício do bot, o cliente deve reenviar a mensagem
com o código da reserva para recomeçar. Os dados já confirmados permanecem no
banco.

## Validação local sem banco ou conexão com WhatsApp

```sh
node --import tsx --test scripts/tests/delivery.test.ts
npm run typecheck
npm run lint
```

Para homologar a integração, use uma reserva de teste em uma base separada:
escolha entrega, tente um telefone inválido, preencha os dados, corrija o resumo
e confirme. Confira a taxa no Pix e a etiqueta no painel. Verifique também
retirada sem perguntas de endereço, reserva antiga sem endereço, reserva
finalizada/cancelada e acesso à etiqueta sem login.
