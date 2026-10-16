# Backend FastMeals

API REST em Node.js, TypeScript e Express. Porta padrão: **3001**.

## Requisitos

- Node.js 22
- PostgreSQL 16

## Rodar localmente

Na raiz do repositório, suba só o banco:

```bash
docker compose up db -d
```

Depois, neste diretório:

```bash
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run dev
```

A API fica em `http://localhost:3001`. Saúde: `GET /api/health`.

## Testes

Com o Postgres no ar e as migrations aplicadas:

```bash
npm test
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | API com reload |
| `npm run build` | Compila para `dist/` |
| `npm start` | Sobe a build |
| `npm run seed` | Relê `../seed/data.json`, limpa o domínio e reinsere |
| `npm test` | Vitest |

O seed zera usuários, produtos, pedidos, entregadores e refresh tokens antes de inserir de novo. Reiniciar o container do backend também roda o seed.
