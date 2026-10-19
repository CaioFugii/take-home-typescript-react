# Decisões — FastMeals

## Stack

### Express

A API é pequena e o contrato já está descrito em rotas REST. Express deixa o fluxo explícito (middleware de erro, cookie, rate limit) e é simples de testar com Supertest. Fastify ganharia validação nativa, mas Zod já cobre o body e o ganho não compensa a troca nesta base.

### TypeORM + PostgreSQL

O critério eliminatório exige PostgreSQL, mesmo o README citando outros bancos. O acesso ao banco usa TypeORM no modo Data Mapper. As entidades ficam em `backend/src/infrastructure/database/` e não herdam `BaseEntity`.

A migration `Init1760600000000` é o schema reproduzível. Ela cria os enums, as tabelas, as chaves, os índices do `docs/database-schema.md` (inclusive o composto `status + created_at`) e os checks que decorador não expressa: `price > 0`, `preparation_time` entre 1 e 120, quantidades e totais positivos, latitude e longitude no intervalo geográfico. Os `id` continuam `UUID`, com `gen_random_uuid()` como default no banco. `synchronize` fica desligado: o TypeORM não altera tabela fora da migration.

### Domínio e infraestrutura

A camada de domínio e a camada de infraestrutura ficam separadas para a manutenção no futuro e para trocar o provedor ou o banco sem reescrever as regras. Pedido, produto, entregador e status moram em `backend/src/domain/`. TypeORM, SQL, migration e seed moram em `backend/src/infrastructure/database/`.

O domínio publica interfaces de repositório. Os serviços dependem dessas interfaces. O `composition.ts` é o único ponto que liga cada interface à classe TypeORM. Uma troca de banco implementa as mesmas interfaces e altera essa ligação. As regras (`assertStatusTransition`, preço do pedido, produto em uso) permanecem.

O erro de regra é um `DomainError`, sem status HTTP. O `error-handler` traduz o código: `ORDER_NOT_FOUND` vira 404 e `INVALID_STATUS_TRANSITION` vira 422. `AppError` fica na borda HTTP, para autenticação e validação.

Dentro de `backend/src/infrastructure/database/`, três pastas existem só para organizar o código. O comportamento da API não muda.

- `entities/` tem um arquivo por tabela.
- `repositories/` tem a implementação TypeORM de cada interface do domínio.
- `utils/` tem as transformações de valor, como `decimalTransformer`, que converte decimal do Postgres em número.

A mesma organização vale para o domínio e para as rotas, também sem mudar o comportamento. `domain/repositories/` guarda só os contratos de repositório. Regras, status e catálogo continuam na raiz de `domain/`. `routes/schemas/` guarda a validação Zod. Os arquivos de rota continuam só com o caminho HTTP e o controller.

### Zod

Validação de ambiente e de body num formato único. O erro vira `400 VALIDATION_ERROR` com `details[].field` e `details[].message`.

### Vitest + Supertest

O mesmo runner serve para teste de rota sem subir a porta. A suíte cobre autenticação, produtos, pedidos, entregadores, o algoritmo e os relatórios.

No frontend o Vitest roda com Testing Library e jsdom. O `fetch` é trocado no teste, então a tela de login não depende da API nem de um browser. Playwright cobriria o cookie de verdade, mas o critério pede renderização, clique e o fluxo de login; isso cabe no jsdom sem subir o stack.

### Pino

Log estruturado em JSON, com o logger em silêncio nos testes. É o bônus de observabilidade, barato de colocar agora. `Authorization`, `Cookie` e `Set-Cookie` saem redigidos, para o refresh token não aparecer no log.

### React, Vite, React Router e Tailwind

Vite é o dev server da porta 3000 e faz o proxy de `/api`. O estado de sessão fica num contexto pequeno: não há cache de servidor ainda, então Zustand ou Redux seriam indireção sem ganho. Tailwind existe para o visual ser próprio, sem kit de componentes pronto.

## Tokens

A spec devolve `accessToken` e `refreshToken` no JSON. O critério de avaliação trata token no frontend sem `httpOnly` como falha grave. A convivência é esta:

- O JSON segue `docs/api-spec.md`, para clientes e testes da API.
- O refresh token também vai no cookie `refreshToken`: `httpOnly`, `SameSite=Lax`, `path=/api/auth`.
- O access token vive só em memória no React. Recarregar a página chama `POST /api/auth/refresh` com o cookie e pede `GET /api/auth/me`.
- `Secure` fica desligado por padrão (`COOKIE_SECURE=false`) porque o `docker compose` local publica HTTP. Em HTTPS real, ligar `COOKIE_SECURE=true`.

O Vite, em desenvolvimento, e o nginx, no Docker, fazem proxy de `/api` para o backend. O browser fala com um único origin, então o cookie não depende de CORS entre as portas 3000 e 3001.

Cada refresh grava o SHA-256 do token novo e revoga o anterior. Reusar um token já rotacionado falha com `401 INVALID_REFRESH_TOKEN`.

## Tabelas além do schema de referência

### `refresh_tokens`

O JWT de refresh sozinho não dá revogação. A tabela guarda o hash (nunca o token cru), a expiração e `revoked_at`. Logout e rotação marcam a linha.

### `order_status_events`

O tempo médio de entrega é a distância entre `orders.created_at` e a transição para `delivered`. `updated_at` muda em qualquer alteração posterior e perde esse instante. Cada evento guarda `from_status`, `to_status` e `created_at`. O seed dos pedidos já entregues grava a passagem `delivering -> delivered`, 40 minutos depois da criação do pedido, para o relatório ter dado real quando for implementado.

## Rate limit

`express-rate-limit` aplica 100 requisições por minuto por IP em `/api`. Atrás do nginx o Express confia no primeiro proxy (`trust proxy = 1`) e lê o IP encaminhado. Estouro responde `429 RATE_LIMIT_EXCEEDED`.

## Produtos

O painel, para admin e viewer, lista também os produtos indisponíveis. Os dois perfis operam o painel interno. A spec separa isso de uma listagem pública, e ainda não existe vitrine sem autenticação. O filtro `isAvailable` cobre os dois casos: omitido, devolve o cardápio inteiro; `true` ou `false`, restringe.

`PUT /api/products/:id` aceita atualização parcial. O formulário envia o produto inteiro; o interruptor de disponibilidade envia só `isAvailable`. Excluir continua bloqueado enquanto houver item em pedido `pending` ou `preparing`.

## Pedidos

Cada mudança de status grava uma linha em `order_status_events`, com o status anterior e o novo. O relatório de tempo médio usa a passagem para `delivered`. O filtro de data da listagem (`startDate` e `endDate`, `YYYY-MM-DD`) não está na tabela da spec, mas a tela pede filtro por data. O intervalo é inclusivo e interpretado em UTC.

`ready` só vai para `delivering` com um entregador atribuído. A listagem `GET /api/delivery-persons` aceita `isActive` e `available`. Excluir quem está em uma entrega responde `409 DELIVERY_PERSON_IN_USE`. Quem só tem pedidos já encerrados pode ser removido; a chave estrangeira então zera o entregador nesses pedidos.

`GET /api/products` e `GET /api/orders` paginam no banco (`LIMIT`/`OFFSET`, no máximo 100 itens por página). Os índices de `created_at`, `status + created_at`, categoria, nome e disponibilidade cobrem os filtros da tela. Com 10.000 produtos e 10.000 pedidos, a primeira página, a última e a página filtrada respondem em menos de 200 ms. O teste `listings-performance` repete essa carga.

## Atribuição

`POST /api/orders/optimize-assignment` lê os pedidos `ready` e os entregadores ativos, com latitude e longitude, que não estão em outro pedido `delivering`. A distância é Haversine com raio de 6371 km. O emparelhamento é o algoritmo húngaro (Kuhn–Munkres), O(n³) na matriz quadrada.

A matriz é quadrada mesmo quando os dois lados têm tamanhos diferentes. O lado que sobra vira coluna ou linha fictícia com custo 1.000.000 km, acima de qualquer distância real na Terra. Quem cai nessa célula volta em `unassigned` com `No available delivery person`. Entregador sem os dois eixos fica de fora da matriz: sem coordenada não há distância.

O guloso do vizinho mais próximo é O(n²) e pode aumentar a soma. Um caso pequeno em teste mostra isso: a primeira linha prefere a coluna 0 (custo 1), e a segunda fica com a coluna cara (100). O ótimo troca as colunas e soma 3,5. Força bruta seria n!, inviável perto do limite de 50 pedidos e 30 entregadores. O húngaro cabe folgado nesse teto.

Empate de custo fica com a primeira solução que o algoritmo encontra. A ordem de entrada é estável: pedidos por `createdAt`, entregadores por nome. A sugestão não grava nada. Aceitar na tela chama a atribuição e só então passa o pedido para `delivering`.

## Relatórios

As quatro rotas ficam em `/api/reports` e aceitam admin e viewer. Receita, produtos mais vendidos e tempo médio usam o mesmo intervalo inclusivo em UTC da listagem de pedidos, aplicado em `orders.created_at`. Só entram pedidos `delivered`.

A receita diária agrupa pelo dia UTC da criação. O ticket médio é a soma dividida pela quantidade; período vazio devolve zero. O ranking soma `quantity * unit_price` dos itens, ordena por quantidade e limita em 10 na tela.

O tempo médio é a distância entre `orders.created_at` e o primeiro evento `to_status = delivered`. Sem esse evento o pedido não entra na média, mesmo que o status atual seja `delivered`. `fastestMinutes` e `slowestMinutes` são minutos inteiros; a média fica com uma casa. Pedido cujo entregador foi apagado continua na média geral e sai de `byVehicleType`, porque a chave estrangeira zera o veículo.

`GET /api/reports/orders-by-status` não recebe data. É a foto da fila inteira, com os seis status, inclusive os que estão em zero. Os gráficos são SVG próprio: linha da receita diária e barras da fila. Não entrou biblioteca de chart.

## O que ficou de fora de propósito

Teste de ponta a ponta no browser e o monitoramento de tempo do algoritmo. O critério trata os dois como diferencial.
