# Dados e etiqueta de entrega

Ao escolher motoboy, o cliente informa bairro/cidade, destinatário, rua, número,
telefone com DDD, complemento e referência. Os dois últimos podem ser pulados.
O bot exibe um resumo e permite confirmar ou refazer os dados. Somente a
confirmação grava a entrega e libera a mensagem de pagamento. A conferência do
Pix continua manual pela Mila. Por padrão, permanece a taxa fixa de R$ 30,00.

## Frete por distância (Geoapify)

O painel tem o atalho **Frete**, em `/admin/frete`. O cálculo por distância
começa desativado. Informe o endereço de saída em Joinville/SC, o valor mínimo
e o preço por km, e escolha se cobra apenas ida ou o trajeto de ida e volta.
O mínimo funciona como piso: `máximo(mínimo, distância em km × preço por km)`.
Não há taxa adicional somada ao mínimo. Frações de km são proporcionais e o
resultado é arredondado para centavos.

Configure `GEOAPIFY_API_KEY` no ambiente **do site e do bot**, sem prefixo
`NEXT_PUBLIC_`. A chave nunca é enviada ao navegador ou gravada nas reservas.
As variáveis opcionais `DELIVERY_ORIGIN_STREET`, `DELIVERY_ORIGIN_NUMBER` e
`DELIVERY_ORIGIN_NEIGHBORHOOD` preenchem inicialmente o formulário; os valores
salvos no painel passam a ser usados pelos dois serviços.

O mapa deve identificar rua, número e cidade com alta confiança. Se o endereço
de saída não for encontrado com precisão, use os campos opcionais de latitude
e longitude, conferidos no ponto exato do imóvel. Uma coordenada retornada
apenas para a cidade, bairro ou rua não representa a casa. Ao trocar o endereço,
atualize ou limpe as coordenadas. Sem informação suficiente, a ativação é
recusada e a configuração anterior é preservada.

O bot coleta o endereço completo e consulta uma rota de motocicleta. Para ida
e volta, consulta o trajeto com retorno, pois o caminho pode mudar devido ao
sentido das ruas. O resumo mostra o endereço encontrado, a distância e o frete.
O cliente pode corrigir ou confirmar. O valor confirmado fica no campo de
frete da reserva e é incluído no total Pix existente. As configurações são
capturadas ao escolher motoboy e a cotação permanece na conversa por até 30
minutos; alterações posteriores não mudam silenciosamente aquele valor.

Não são enviados ao Geoapify nome, telefone, complemento, referência nem ID da
reserva, apenas os dados necessários de endereço/coordenadas. A origem não é
exibida ao cliente. O resumo inclui atribuição ao Geoapify e OpenStreetMap.

Endereço ambíguo, imóvel sem número localizado, destino fora de Joinville,
baixa confiança, falha, timeout, limite de consultas ou trajeto com pedágio ou
balsa não geram cobrança automática. O cliente pode tentar novamente, corrigir,
voltar para retirada ou solicitar a Mila. Não há substituição silenciosa por
frete zero ou R$ 30 no modo por distância.

O controle local reserva no máximo 2.400 créditos por dia UTC e espaça as
consultas entre os processos usando o banco. A reserva é conservadora: 1 crédito
por geocodificação e 2/4 por rota de ida/ida e volta, incluindo tentativas que
falham. Há espera de 20 segundos entre tentativas de cotação da mesma conversa.
Outros projetos e consultas manuais da mesma conta não são contabilizados por
este controle; acompanhe o uso no painel Geoapify. Rotas acima de 200 km por ida
(400 km com retorno) são encaminhadas à conferência manual.

Referências da integração:
- [Geocodificação](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
- [Rotas e consumo de créditos](https://apidocs.geoapify.com/docs/routing/)
- [Plano gratuito e atribuição](https://www.geoapify.com/pricing/)

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

A migração acrescenta colunas opcionais e as tabelas `delivery_settings` e
`delivery_api_usage`, e pode ser repetida. Não remove reservas, não sobrescreve
taxas existentes e não ativa o cálculo por distância. `npm start` e `npm run whatsapp`
já executam essa migração; `npm run dev` não a executa. Publique/reinicie o site
e o serviço do WhatsApp após a atualização. Use a mesma base nos dois serviços.

Como no fluxo existente, as conversas em andamento ficam em memória por 30
minutos. Após expiração ou reinício do bot, o cliente deve reenviar a mensagem
com o código da reserva para recomeçar. Os dados já confirmados permanecem no
banco.

## Validação local sem banco ou conexão com WhatsApp

```sh
node --import tsx --test scripts/tests/delivery.test.ts scripts/tests/shipping.test.ts
npm run typecheck
npm run lint
```

Para homologar a integração, use uma reserva de teste em uma base separada:
escolha entrega, tente um telefone inválido, preencha os dados, corrija o resumo
e confirme. Confira a taxa no Pix e a etiqueta no painel. Verifique também
retirada sem perguntas de endereço, reserva antiga sem endereço, reserva
finalizada/cancelada e acesso à etiqueta sem login.
