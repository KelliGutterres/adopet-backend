# Spec 003 — Auth JWT (schema + cadastro/login usuário e ONG)

> **Status:** aprovada e implementada.
> Cards Trello relacionados: cadastro usuário; login usuário → JWT; cadastro/login ONG → JWT; middleware auth; middleware por papel.

## Objetivo

Habilitar autenticação na API REST com **JWT** e senhas com **hash**, para os papéis `usuario` e `ong` (Instituicao), cobrindo RF0001 (parcial), RF0002, RF0009 e RNF0002.

## Escopo (esta tarefa)

1. **Migration** no Prisma: campos de auth em `Usuario` e `Instituicao`
2. Dependências: `bcrypt` (ou `bcryptjs`) + `jsonwebtoken`
3. Variáveis: `JWT_SECRET`, `JWT_EXPIRES_IN` no `.env` / `.env.example`
4. Camada `src/controllers/` (entra nesta feature)
5. Endpoints de cadastro e login (usuário e ONG)
6. Middlewares: `authenticate` (JWT) + `authorize(...papeis)`
7. Atualizar `docs/CONTEXTO-PROJETO.md` (decisões + checklist backend auth)

## Fora de escopo

- CRUD de animais / atributos extras de Animal (espécie, porte, situação…)
- Seed de dados
- Refresh token / logout server-side / blacklist
- Recuperação de senha / e-mail de verificação
- Telas Web/Mobile (só API)
- Supabase / IA
- Padronização completa do envelope de erro da API (manter padrão atual `{ error: { message } }` salvo decisão no refinamento)
- Gerenciamento de usuários pela ONG (casos de uso admin além do próprio login)

## RF/RNF relacionados

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0001 | Cadastro de usuário com e-mail/senha (+ dados básicos). **Edição de perfil:** ver ponto aberto |
| RF0002 | Login usuário → JWT |
| RF0009 | Cadastro e login ONG → JWT |
| RNF0002 | Senha só com hash; secret JWT em `.env` |

## Modelo de dados (delta sobre spec 002)

### `Usuario` — campos novos

| Campo | Tipo proposto | Notas |
|-------|---------------|--------|
| `email` | `String` `@db.VarChar(150)` `@unique` | Login |
| `senha` | `String` `@db.VarChar(100)` | **Hash** bcrypt (nunca texto puro) |

Campos existentes mantidos: `nome`, `contato`, `status`, `idCidade`.

### `Instituicao` — campos novos

| Campo | Tipo proposto | Notas |
|-------|---------------|--------|
| `email` | `String` `@db.VarChar(150)` `@unique` | Login do painel ONG |
| `senha` | `String` `@db.VarChar(100)` | Hash bcrypt |
| `contato` | `String` `@db.VarChar(20)`? | **[A REFINAR]** — MER não tem; útil para cadastro ONG |

### Papel JWT

**Não** criar coluna `papel` nas tabelas. O papel vem do **endpoint de login**:

| Endpoint de login | Claim `papel` |
|-------------------|---------------|
| Login usuário | `"usuario"` |
| Login ONG | `"ong"` |

Payload JWT proposto:

```json
{
  "sub": 1,
  "papel": "usuario",
  "email": "a@b.com"
}
```

- `sub` = `idUsuario` ou `idInstituicao` conforme o papel
- Assinatura HS256 com `JWT_SECRET`

## Contratos de API

Prefixo sugerido: `/auth`  
Respostas de sucesso **não** retornam o campo `senha`.

### `POST /auth/usuarios/cadastro`

**Body**

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "senha": "senha123",
  "contato": "51999999999",
  "idCidade": 1
}
```

- `status` do usuário: default `"A"` (ativo) — **[A REFINAR]** valores permitidos
- `idCidade` obrigatório no cadastro — **[A REFINAR]** se cidade pode ser criada inline ou seed prévio

**201**

```json
{
  "usuario": {
    "idUsuario": 1,
    "nome": "Maria Silva",
    "email": "maria@email.com",
    "contato": "51999999999",
    "status": "A",
    "idCidade": 1
  },
  "token": "<jwt>"
}
```

**Erros:** `400` validação; `409` e-mail já cadastrado.

### `POST /auth/usuarios/login`

**Body**

```json
{
  "email": "maria@email.com",
  "senha": "senha123"
}
```

**200** — mesmo formato `{ usuario, token }` (sem senha).

**Erros:** `401` credenciais inválidas (mensagem genérica, sem revelar se o e-mail existe).

### `POST /auth/ongs/cadastro`

**Body**

```json
{
  "nome": "ONG Amigos Pets",
  "email": "contato@ong.org",
  "senha": "senha123",
  "idCidade": 1
}
```

**201**

```json
{
  "ong": {
    "idInstituicao": 1,
    "nome": "ONG Amigos Pets",
    "email": "contato@ong.org",
    "idCidade": 1
  },
  "token": "<jwt>"
}
```

### `POST /auth/ongs/login`

**Body:** `{ "email", "senha" }`  
**200:** `{ "ong", "token" }`  
**401:** credenciais inválidas.

### Middlewares

| Middleware | Comportamento |
|------------|----------------|
| `authenticate` | Lê `Authorization: Bearer <token>`; valida JWT; preenche `req.auth = { id, papel, email }` |
| `authorize(...papeis)` | Ex.: `authorize('ong')` → `403` se `req.auth.papel` não estiver na lista |

**Rota de fumaça (opcional nesta spec):** `GET /auth/me` protegida por `authenticate` — retorna `{ id, papel, email }` do token. Útil para validar middleware sem CRUD.

## Arquitetura de código

```
src/
  controllers/     # novo
    auth.controller.js
  routes/
    auth.routes.js
  services/
    auth.service.js
  middleware/
    authenticate.js
    authorize.js
    errorHandler.js    # existente
```

Fluxo: **rotas → controllers → services → Prisma** (`src/db`).

## Decisões técnicas (propostas)

| Item | Proposta | Refinar? |
|------|----------|----------|
| Hash | bcrypt, cost factor `10` | |
| JWT | `jsonwebtoken`, HS256 | |
| Expiração | `7d` (env `JWT_EXPIRES_IN`) | sim |
| Unicidade e-mail | `@unique` em Usuario e em Instituicao **separados** (mesmo e-mail pode existir nos dois mundos) | sim — ou unique global? |
| Nome “ONG” na API | Rotas `/auth/ongs`; model Prisma continua `Instituicao` | |
| Cadastro retorna token | Sim (já autenticado após cadastro) | |
| Controllers | Introduzir pasta nesta feature | |
| Validação de input | Manual no service/controller (sem Zod/Joi nesta fatia) | sim |
| Edição de perfil (RF0001) | **Fora** desta spec → spec 004 ou card “Editar perfil” | sim |

## Pontos abertos para refinamento

Decisões na aprovação (implementação):

1. Edição de perfil → **depois** (fora da 003)
2. `idCidade` **obrigatório**; cidade deve existir no banco
3. Cadastro público de ONG **permitido**
4. E-mail duplicado Usuario↔Instituicao **permitido** (unique por tabela)
5. `status` Usuario: default `"A"` (ativo); `"I"` reservado para futuro
6. `contato` na Instituicao → **não** nesta spec
7. Envelope `{ error: { message } }` mantido
8. Senha mínima: **6** caracteres
9. Spec única cobrindo schema + endpoints + middleware → **ok**

## Critérios de pronto

- [x] Spec aprovada (refinamento + card Trello alinhado)
- [x] Migration aplicada com `email`/`senha` em Usuario e Instituicao
- [x] Cadastro/login usuário e ONG funcionando (Postman/Insomnia ou curl)
- [x] Senha nunca retornada nem gravada em texto puro
- [x] `authenticate` + `authorize('usuario'|'ong')` testáveis via `/auth/me` ou rota equivalente
- [x] `.env.example` com `JWT_SECRET` e `JWT_EXPIRES_IN` (sem secrets reais)
- [x] CONTEXTO atualizado

## Como validar (após implementação)

```powershell
cd D:\adopet-backend
npx prisma migrate dev --name auth-fields
npm run dev
# POST /auth/usuarios/cadastro → token
# POST /auth/usuarios/login
# GET /auth/me com Authorization: Bearer …
# Repetir fluxo /auth/ongs/*
```

## Checklist de implementação (após aprovação)

1. Ajustar schema + migration
2. Instalar `bcrypt` + `jsonwebtoken`; documentar env
3. `auth.service` (hash, compare, signJwt)
4. Controllers + rotas `/auth`
5. Middlewares `authenticate` / `authorize`
6. Atualizar CONTEXTO e marcar cards Trello
