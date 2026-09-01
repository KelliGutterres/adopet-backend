# Spec 009 — Edição de contas (usuário e ONG) + exclusão de usuários pela ONG

> **Status:** aprovada e implementada.  
> Pontos 1–12 fechados em 2026-08-31 (pacote A).  
> Depende de: spec 003 (JWT + cadastro/login); spec 007 (cidade inline); spec 006 (esqueci senha — **não** misturar).  
> Fatias futuras: mobile (ícone lápis do perfil — spec 009 mobile) e painel web (gerenciar usuários). **Esta fatia é só API.**  
> Fecha o ponto aberto da spec 003 (“edição de perfil depois”) e a pendência do CONTEXTO (“CRUD usuários, instituições/ONGs além de auth”).

## Objetivo

Permitir que **usuário** e **ONG** editem **os próprios dados** da conta, e que a **ONG** (admin do painel) **liste e exclua usuários**. Cobre **RF0001** (edição da conta), o caso de uso da ONG “gerenciar usuários” (§4.5) e **RNF0002** (JWT + senha nunca retornada).

Canais previstos (não entram nesta spec):

| Canal | Quem | Depois desta API |
|-------|-------|------------------|
| Mobile | `usuario` | Formulário de perfil (hoje o lápis está “Em breve”) |
| Web | `ong` | Editar dados da própria ONG + listar/excluir usuários |

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| Cadastro/login usuário e ONG | spec 003 | **inalterado** |
| Esqueci senha (público, e-mail + senha nova) | spec 006 | **inalterado** — não reusar no perfil |
| Cidade `{ nome, uf }` | spec 007 | **reusar** no PATCH (find-or-create) |
| `GET /auth/me` → `{ id, papel, email }` | spec 003 / 007 | **inalterado** (fumaça do JWT) |
| ONG edita/exclui qualquer animal | spec 008 | **inalterado** |
| Edição persistida no mobile | mobile spec 009 | **depende desta API** |

## Escopo (esta tarefa)

1. Recurso REST `/usuarios` (consulta + edição da própria conta; listagem e exclusão pela ONG)
2. Recurso REST `/ongs` (consulta + edição da própria instituição)
3. Validação alinhada ao cadastro (nome, e-mail, contato, cidade); senha **não** entra no body
4. Atualizar Postman e `docs/CONTEXTO-PROJETO.md` após aprovação + implementação

## Fora de escopo

- Telas web / mobile
- Troca de senha **logada** (`senhaAtual` + `senhaNova`) — continua spec 006 para “esqueci”
- Usuário excluir a **própria** conta
- ONG excluir **outra ONG** / listar instituições
- ONG **editar dados de outro usuário** (só lista e exclui)
- Soft-delete via `status = "I"` (hard delete; 409 se houver animais)
- Invalidar JWTs já emitidos (não há blacklist hoje, igual spec 006)
- Foto de perfil / Storage
- Envelope de erro novo
- Role `admin` separado no JWT
- Cadastro de usuário pela ONG (a ONG não cria conta de usuário nesta fatia)

## RF/RNF relacionados

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0001 | Edição da conta do usuário (nome, e-mail, contato, cidade) |
| RF0009 | **Parcial** — ONG edita a própria conta (não é login) |
| RF0010 | Painel passa a ter API para gerenciar usuários |
| RNF0002 | Mutações com JWT; senha nunca no GET/PUT; hash intacto |

## Contexto técnico (hoje)

Não existem rotas `/usuarios` nem `/ongs` fora de `/auth`. Conta só nasce no cadastro e só muda senha no “esqueci”.

| Já existe | Onde |
|---------|------|
| `Usuario`: nome, email, senha (hash), contato, status `A`/`I`, idCidade | Prisma + spec 003 |
| `Instituicao`: nome, email, senha, idCidade — **sem** contato | Prisma |
| `usuarioPublico` / `ongPublica` (sem senha, com `cidade`) | `auth.service.js` |
| `findOrCreateCidade` + `rejeitarIdsLegados` | `localidade.service.js` |
| `authenticate` + `authorize('usuario'\|'ong')` | middlewares |
| Login **não** checa `Usuario.status` | qualquer `A` ou `I` autentica hoje |
| `Animal.idUsuario` opcional; Prisma **restringe** delete se houver animais | schema (sem `onDelete: Cascade`) |
| `GET /animais` público; mutações com JWT | spec 005 / 008 |

`status` do usuário (`A` ativo / `I` inativo) está **reservado** desde a spec 003 e **não é usado** no login.

## Contrato

Prefixos novos, **fora** de `/auth` (auth continua cadastro/login/senha). Alinhado à convenção do CONTEXTO: REST no plural (`/usuarios`, `/ongs`).

Respostas de sucesso **nunca** retornam `senha`. Envelope de erro inalterado: `{ error: { message } }`.

### Autorização

| Operação | Auth | Quem passa |
|---------|------|------------|
| `GET /usuarios/me` | JWT + `usuario` | o próprio (`auth.id`) |
| `PUT` / `PATCH /usuarios/me` | JWT + `usuario` | o próprio |
| `GET /ongs/me` | JWT + `ong` | a própria instituição |
| `PUT` / `PATCH /ongs/me` | JWT + `ong` | a própria |
| `GET /usuarios` | JWT + `ong` | qualquer ONG autenticada |
| `GET /usuarios/:id` | JWT + `ong` | qualquer ONG autenticada |
| `DELETE /usuarios/:id` | JWT + `ong` | qualquer ONG autenticada |

Sem JWT → **401**. Papel errado → **403** `Acesso negado`.  
`usuario` em rota de ONG (`GET /usuarios`, `DELETE`, `/ongs/me`) → **403**.  
`ong` em `/usuarios/me` → **403** (a ONG edita a si em `/ongs/me`).

Id inexistente em `GET`/`DELETE /usuarios/:id` → **404** `Usuário não encontrado` (antes de qualquer outra regra).

### Objeto `usuario` (saída — igual ao login)

```json
{
  "idUsuario": 2,
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "contato": "51999999999",
  "status": "A",
  "idCidade": 1,
  "cidade": { "idCidade": 1, "nome": "Lajeado", "uf": "RS" }
}
```

### Objeto `ong` (saída — igual ao login)

```json
{
  "idInstituicao": 1,
  "nome": "ONG Amigos Pets",
  "email": "contato@ong.org",
  "idCidade": 1,
  "cidade": { "idCidade": 1, "nome": "Lajeado", "uf": "RS" }
}
```

### `GET /usuarios/me`

**200** `{ "usuario": { … } }` lido do banco (não do JWT). Útil para o mobile hidratar o perfil depois da edição e para sessão antiga no SecureStore.

### `PUT` / `PATCH /usuarios/me`

Mesmo handler (parcial, como `/animais`). Campos **opcionais**; só atualiza o que vier. Body vazio → **400** `Nenhum campo para atualizar`.

**Body (exemplo — todos os editáveis)**

```json
{
  "nome": "Maria Souza",
  "email": "maria.souza@email.com",
  "contato": "51988888888",
  "cidade": { "nome": "Estrela", "uf": "RS" }
}
```

| Campo | Regra |
|-------|---------|
| `nome` | se vier: trim; 1–150 |
| `email` | se vier: mesmo regex do cadastro; gravar minúsculo; **409** se outro usuário já usa |
| `contato` | se vier: trim; 1–20 (mesmo do cadastro — dígitos no cliente) |
| `cidade` | se vier: find-or-create (spec 007); **não** aceitar `idCidade` |
| `senha` | **400** se enviado — usar spec 006 |
| `status` | **400** se enviado — o usuário não altera o próprio status |
| `idCidade` / `idRaca` | **400** (`rejeitarIdsLegados`) |

**200** `{ "usuario": { … } }` atualizado. **Não** devolve token novo (ponto 9).

E-mail igual ao atual: ok, sem 409. Unique só contra **outro** `idUsuario`.

### `GET /ongs/me`

**200** `{ "ong": { … } }` do banco.

### `PUT` / `PATCH /ongs/me`

Parcial. Campos: `nome` (1–100), `email` (unique em `Instituicao`), `cidade`. Mesmas regras de senha / `idCidade` / body vazio.

**200** `{ "ong": { … } }`.

A ONG **não** tem `contato` no MER — não inventar o campo.

### `GET /usuarios`

Só ONG. Lista todos os usuários (sem senha). Sem paginação (igual `GET /animais`). Sem filtro nesta fatia.

**200**

```json
{
  "usuarios": [ { "idUsuario": 2, "nome": "…", "email": "…", "contato": "…", "status": "A", "idCidade": 1, "cidade": { } } ]
}
```

Ordem: `idUsuario` crescente.

### `GET /usuarios/:id`

Só ONG. **200** `{ "usuario": { … } }` ou **404**.

### `DELETE /usuarios/:id`

Só ONG. **204** sem body.

**Não** permite a ONG “excluir a si” — o alvo é `Usuario`, não `Instituicao`.

**Conflito com animais:** se o usuário tiver **qualquer** animal (`idUsuario` apontando para ele) → **409** `Usuário possui animais vinculados e não pode ser excluído`. A ONG exclui os animais antes, usando a spec 008.

Sem `onDelete: Cascade` no Prisma nesta fatia.

## Arquitetura de código

```
src/
  controllers/
    usuarios.controller.js
    ongs.controller.js
  routes/
    usuarios.routes.js      # /usuarios
    ongs.routes.js          # /ongs
  services/
    contas.mappers.js       # usuarioPublico / ongPublica (reuso do auth)
    usuarios.service.js
    ongs.service.js
src/routes/index.js         # registrar os dois prefixos
```

Reusar `usuarioPublico` / `ongPublica` (extrair de `auth.service.js` para não duplicar, ou importar).  
`findOrCreateCidade` + `rejeitarIdsLegados` inalterados.

Camadas: rotas → controllers → services → Prisma. **Sem migration** (schema já tem os campos).

Cuidado de rota: declarar `/me` **antes** de `/:id` no router de usuários.

## Regras de negócio

1. Papel `usuario` só mexe na **própria** linha (`auth.id` = `idUsuario`).
2. Papel `ong` só mexe na **própria** `Instituicao` em `/ongs/me`.
3. Papel `ong` lista e exclui **qualquer** `Usuario`.
4. Edição **não** altera senha nem status.
5. E-mail único **por tabela** (inalterado): o mesmo e-mail pode existir em Usuario e Instituicao.
6. Cidade nova no PATCH cria linha (find-or-create); cidade antiga órfã **não** é apagada.
7. JWT continua válido depois do PATCH (não há blacklist). Se o e-mail mudou, o claim `email` do token fica **stale** até o próximo login (ponto 9).
8. Não logar senha nem JWT.

## Decisões fechadas na aprovação (2026-08-31)

Pacote **A** em todos os pontos.

| # | Decisão |
|---|---------|
| 1 | Rotas `/usuarios` e `/ongs` (fora de `/auth`) |
| 2 | `/me` para o próprio; `:id` só na listagem/exclusão da ONG |
| 3 | Usuário edita nome, e-mail, contato, cidade. Sem senha, sem status |
| 4 | ONG edita nome, e-mail, cidade |
| 5 | ONG **não** edita outro usuário — só lista e exclui |
| 6 | `GET /usuarios` entra nesta spec |
| 7 | Hard delete + **409** se o usuário tiver animais |
| 8 | Usuário **não** exclui a própria conta |
| 9 | **Não** reemitir JWT; cliente guarda o objeto da resposta |
| 10 | `GET /auth/me` inalterado `{ id, papel, email }` |
| 11 | `PUT` e `PATCH` parciais (igual `/animais`) |
| 12 | Login **não** checa `Usuario.status` |

`status = "I"` continua reservado e sem efeito. Sem soft-delete, o login não precisa tratar conta inativa.

## Critérios de pronto (após aprovação + implementação)

- [x] Pontos 1–12 fechados nesta spec
- [x] Login usuário + `PATCH /usuarios/me` (nome/cidade) → **200** com objeto atualizado, sem senha
- [x] Mesmo usuário + `PATCH` com e-mail já usado por outro → **409**
- [x] `PATCH /usuarios/me` com `senha` no body → **400**
- [x] Token de ONG em `/usuarios/me` → **403**
- [x] Login ONG + `PATCH /ongs/me` → **200**
- [x] Login usuário em `/ongs/me` → **403**
- [x] ONG + `GET /usuarios` → lista inclui o seed (`usuario@adopet.local`)
- [x] ONG + `DELETE /usuarios/:id` de um usuário **sem** animais → **204**; GET seguinte → **404**
- [x] ONG + `DELETE` do usuário do seed (**Mel** vinculada) → **409**
- [x] Usuário + `DELETE /usuarios/:id` → **403**
- [x] Sem JWT → **401**
- [x] Cadastro/login/esqueci senha **inalterados**
- [x] Postman atualizado
- [x] CONTEXTO: checklist backend + decisão §8 + pendência “edição de perfil”

## Como validar (após implementação)

Pré-requisito: API + seed. JWT de `usuario@adopet.local` e `ong@adopet.local` (senha `senha123`).

1. `GET /usuarios/me` com token **usuário** → 200, dados do seed  
2. `PATCH /usuarios/me` `{ "nome": "Usuario Demo Editado" }` → 200; login de novo devolve o nome novo  
3. `PATCH /usuarios/me` com token **ONG** → 403  
4. `PATCH /ongs/me` `{ "nome": "ONG Demo Editada" }` com token ONG → 200  
5. `GET /usuarios` com token ONG → 200, array  
6. Cadastrar um segundo usuário (sem animais) e `DELETE /usuarios/:id` com token ONG → 204  
7. `DELETE` do id do seed (tem a Mel) → 409

Não usar o usuário do seed como alvo do DELETE feliz — ele segura a Mel.

## Checklist de implementação (após aprovação)

1. [x] Fechar pontos 1–12 nesta spec + índice no `specs/README.md`
2. [x] `usuarios.service.js` + `ongs.service.js` (reusar mappers / localidade)
3. [x] Controllers + rotas; `/me` antes de `/:id`
4. [x] Registrar em `src/routes/index.js`
5. [x] Postman
6. [x] CONTEXTO (checklist RF0001 edição API; CRUD usuários/ONG; tabela §8)
7. [x] **Não** implementar web/mobile nesta fatia
