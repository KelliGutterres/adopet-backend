# Spec 001 — Estrutura inicial do backend

## Objetivo

Criar a base do repositório `adopet-backend` com Express e a organização de pastas do MVP, para começar auth JWT e CRUD em seguida.

## Escopo

- Scaffold Node.js + Express
- Pastas: `src/db`, `src/middleware`, `src/routes`, `src/services`
- Entry points: `src/app.js` (app Express) e `src/server.js` (listen)
- Cliente Prisma em `src/db` (sem models de domínio ainda)
- Rota de health check `GET /health`
- `.env.example`, `.gitignore`, `package.json`
- Schema Prisma mínimo (datasource + generator)

## Fora de escopo

- Auth JWT, CRUD de animais/usuários/ONGs
- Controllers (camada entra nas próximas specs)
- Models Prisma de domínio e migrações de negócio
- Integração Supabase / IA
- Testes automatizados

## RF/RNF

- Fundação para RF0001–RF0003, RF0009–RF0010
- RNF0002 (preparação: secrets em `.env`)

## Contratos

### `GET /health`

```json
{ "status": "ok" }
```

Resposta `200`.

## Critérios de pronto

- [x] Spec em `specs/`
- [x] Pastas `src/db`, `src/middleware`, `src/routes`, `src/services` existem
- [x] `npm install` e `npm run start` sobem a API
- [x] `GET /health` responde `{ "status": "ok" }`
- [x] Sem secrets commitados; `.env.example` documenta variáveis

## Decisões

| Item | Escolha |
|------|---------|
| Framework HTTP | Express |
| Módulos | CommonJS |
| ORM | Prisma (cliente em `src/db`) |
| Camadas agora | routes → services → db (controllers nas próximas features) |
