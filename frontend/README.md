# Frontend FastMeals

Painel em React 18, TypeScript e Vite. Porta padrão: **3000**.

## Rodar localmente

A API precisa estar em `http://localhost:3001`. O Vite encaminha `/api` para ela, então o cookie de refresh fica no mesmo origin.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Contas do seed:

| Email | Senha | Perfil |
| --- | --- | --- |
| admin@fastmeals.com | Admin@123 | admin |
| viewer@fastmeals.com | Viewer@123 | viewer |

## Testes

Vitest e Testing Library rodam no jsdom. O `fetch` é substituído: os testes não chamam a API.

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```
