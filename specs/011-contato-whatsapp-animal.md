# Spec 011 — Contato WhatsApp do responsável do animal (API)

> **Status:** aprovada e implementada.  
> Pontos 1–8 fechados em 2026-09-07. Implementada no mesmo dia.  
> Depende de: spec 005 (`GET /animais` e `GET /animais/:id`); spec 003 (cadastro ONG); spec 009 (`PATCH /ongs/me`, `ongPublica`).  
> Consomem: web spec 012 e mobile spec 014.  
> Reabre o ponto adiado da spec 003 (`contato` na `Instituicao`) e da spec 009 (`PATCH /ongs/me` rejeita `contato`).

O detalhe do animal (web e mobile) já mostra **ONG responsável** ou **Cadastrado por** (só `id` + `nome`). Esta fatia expõe o **telefone** do tutor para o cliente montar `https://wa.me/…`. A ONG **não** tem `contato` no MER — passa a ter, senão o WhatsApp de Thor/Luna (e de qualquer animal da instituição) não existe.

## Objetivo

Permitir que quem se interessa por um animal (adoção, perdido ou encontrado) **abra o WhatsApp do responsável** — usuário que cadastrou **ou** ONG — a partir do telefone já gravado na conta.

Cobre o restante do **RF0006** (detalhe: meio de contato com o tutor) e **RNF0002** (não vazar e-mail nem senha; só `contato` do tutor do registro).

O clique, o ícone e o `wa.me` são dos clientes (web 012 / mobile 014). Esta spec é **só API + schema**.

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| `GET /animais` e `GET /animais/:id` — tutor `id` + `nome` | spec 005 | **acrescentar** `contato` no `include` de `usuario` e `instituicao` |
| `Usuario.contato` (obrigatório, 20 chars) | schema / spec 003 | **inalterado** |
| `Instituicao` **sem** `contato` | MER / spec 003 ponto aberto / spec 009 | **criar** o campo |
| `POST /auth/ongs/cadastro` | spec 003 | **exigir** `contato` (igual usuário) |
| `PATCH /ongs/me` rejeita `contato` (400) | spec 009 | **passar a aceitar** |
| `ongPublica` (login/cadastro/me) | `contas.mappers.js` | **incluir** `contato` |
| Seed ONG sem telefone | spec 004 | **preencher** `contato` |
| Envelope, JWT, dono do animal, foto | 003 / 005 / 008 / 010 | **inalterados** |
| UI web / mobile | — | **fora** (012 / 014) |

O `GET` de animais continua **público**. Expor o telefone do tutor é **intencional**: é o meio de contato do RF0006. E-mail do tutor **continua fora** do `include`.

## Escopo (esta tarefa)

1. Migration Prisma: `Instituicao.contato` (`VarChar(20)`, opcional no banco)
2. `POST /auth/ongs/cadastro`: `contato` obrigatório (trim, 1–20; mesma regra do usuário)
3. `ongPublica` + `PATCH /ongs/me`: devolver e aceitar `contato` (parar de rejeitar)
4. `animalInclude`: `usuario` e `instituicao` passam a selecionar `contato` (lista **e** detalhe — um include só)
5. Seed: ONG demo com telefone fictício distinto do usuário
6. Postman + `docs/CONTEXTO-PROJETO.md` após implementação

## Fora de escopo

- Telas web / mobile (ícone, `wa.me`, máscara no form) — web 012 / mobile 014
- Expor `email` do tutor em `GET /animais`
- Validar regex de telefone no Node (continua texto 1–20, como o usuário; dígitos/máscara no cliente)
- Coluna `papel`, role `admin`
- Soft-delete, envelope de erro novo
- WhatsApp Business API / mensagem oficial / webhook
- `mailto:`, SMS, ligação `tel:`
- Filtros (RF0005), IA (RF0008)
- Testes automatizados

## RF/RNF relacionados

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0006 | **Sim** — detalhe ganha o telefone do responsável para contato |
| RF0004 | Lista passa a **trazer** `contato` no JSON (mesmo include); a UI da lista **não** precisa usar |
| RF0009 | Cadastro/edição da ONG passam a gravar `contato` |
| RF0001 | **Não** — conta do usuário inalterada (`contato` já existe) |
| RNF0002 | Sem e-mail/senha no GET público de animal; `contato` só do tutor do registro |

## O que já existe (não reinventar)

| Já pronto | Onde |
|-----------|------|
| `Usuario.contato` `VarChar(20)` obrigatório | `schema.prisma` |
| Cadastro usuário exige `contato` (sem regex) | `auth.service.js` |
| `animalInclude` com `usuario`/`instituicao` só id+nome | `animais.service.js` |
| `rejeitarCamposProibidos(body, ['contato'])` no PATCH ONG | `ongs.service.js` |
| `ongPublica` sem `contato` | `contas.mappers.js` |
| Seed usuário `51999999999` | `prisma/seed.js` |

## Contexto técnico (API)

Envelope inalterado: `{ error: { message } }`. GET de animais **público**. Cadastro ONG **público**. `PATCH /ongs/me` com JWT `ong`.

### Modelo (delta)

`Instituicao.contato`: `String?` `@db.VarChar(20)`.

| Por quê opcional no banco | Por quê obrigatório no cadastro |
|--------------------------|----------------------------------|
| ONGs já existentes (dev/local) não quebram a migration | Novas ONGs sempre têm WhatsApp, igual o usuário |

`PATCH /ongs/me`: se `contato` vier, trim 1–20 (mesmo `optionalTrimmedString` do usuário). Não enviar o campo = não altera.

Não há regex de DDD/país no Node. Clientes (web 012 / mobile 003) já validam 10 ou 11 dígitos e mandam só dígitos.

### `GET /animais` e `GET /animais/:id` (delta do include)

O objeto `animal` ganha `contato` **dentro** do tutor. Envelope `{ animais }` / `{ animal }` inalterado. Demais campos iguais à spec 005 + `urlImagem` (010).

```json
{
  "idAnimal": 1,
  "nome": "Thor",
  "status": "A",
  "instituicao": {
    "idInstituicao": 1,
    "nome": "ONG AdoPet Demo",
    "contato": "51888888888"
  },
  "usuario": null
}
```

```json
{
  "idAnimal": 3,
  "nome": "Mel",
  "status": "E",
  "instituicao": null,
  "usuario": {
    "idUsuario": 1,
    "nome": "Usuario Demo",
    "contato": "51999999999"
  }
}
```

| Campo no tutor | Entra? | Notas |
|----------------|--------|--------|
| `idUsuario` / `idInstituicao` | sim | já existia |
| `nome` | sim | já existia |
| `contato` | **sim** (esta spec) | string; pode ser `null` na ONG antiga |
| `email` | **não** | GET de animal não vaza e-mail |
| `senha` / `status` / `cidade` | **não** | |

O dono continua XOR (`idInstituicao` **ou** `idUsuario`). O cliente usa o `contato` **do mesmo tutor** que a UI já mostra (label da spec de detalhe):

| `status` | Tutor na UI | `contato` lido de |
|----------|-------------|-------------------|
| `A` | ONG responsável | `instituicao.contato`; se `instituicao` null, `usuario.contato` |
| `P` / `E` | Cadastrado por | `usuario.contato`; se `usuario` null, `instituicao.contato` |

Se o tutor existir mas `contato` for `null`/vazio: JSON traz o tutor; o cliente **esconde** o ícone (web 012 / mobile 014).

Lista (`GET /animais`) usa o **mesmo** include. Payload um pouco maior; evita dois `select` e um GET extra no detalhe. As telas de lista **ignoram** `contato`.

### `POST /auth/ongs/cadastro` (delta)

**Body** (além do que a 003/007 já exigem):

```json
{
  "nome": "ONG Amigos Pets",
  "email": "contato@ong.org",
  "senha": "senha123",
  "contato": "51888888888",
  "cidade": { "nome": "Lajeado", "uf": "RS" }
}
```

| Campo | Regra |
|-------|--------|
| `contato` | obrigatório; trim; 1–20 chars; **400** `Contato é obrigatório` se vazio (mesmo texto do usuário) |

**201** — `ong` passa a incluir `contato`. JWT inalterado.

Cadastro **sem** `contato` → **400**. Cliente web antigo que ainda não mandar o campo quebra até a web spec 012 — ordem de implementação: **API primeiro**, depois o painel.

### `GET` / `PATCH /ongs/me` (delta)

`ongPublica`:

```json
{
  "idInstituicao": 1,
  "nome": "ONG AdoPet Demo",
  "email": "ong@adopet.local",
  "contato": "51888888888",
  "idCidade": 1,
  "cidade": { "idCidade": 1, "nome": "Lajeado", "uf": "RS" }
}
```

`PATCH`: **remover** `contato` de `rejeitarCamposProibidos`. Se vier, validar como o usuário (trim, 1–20). Login/`GET /auth/me` inalterados (`{ id, papel, email }`).

`POST /auth/ongs/login` devolve o mesmo `ong` público (agora com `contato`).

### Seed

| Conta | `contato` |
|-------|-----------|
| Usuario Demo | `51999999999` (já existe) |
| ONG AdoPet Demo | `51888888888` (**novo** — DDD 51, distinto do usuário) |

Animais do seed inalterados (Thor/Luna → ONG; Mel → usuário). Depois desta spec, Thor/Luna têm WhatsApp da ONG; Mel tem o do usuário.

## Pontos fechados (2026-09-07)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Onde mora o telefone | **Na conta**, não no animal. Usuário já tem `contato`. ONG **ganha** `contato`. O animal só aponta o tutor. |
| 2 | `contato` na `Instituicao` | **Sim.** MER não tinha; spec 003 deixou aberto; spec 009 recusou inventar. Esta fatia fecha: WhatsApp da ONG é requisito. |
| 3 | Null no banco vs cadastro | Coluna **opcional** (`String?`). Cadastro ONG **obrigatório**. PATCH opcional (só altera se vier). |
| 4 | GET lista vs só detalhe | **Mesmo include** nos dois GETs. Lista ignora na UI. Sem endpoint novo. |
| 5 | E-mail no GET de animal | **Não.** Só `contato`. |
| 6 | Regex no Node | **Não.** Igual usuário: 1–20 chars. Máscara/10–11 dígitos no cliente. |
| 7 | `wa.me` no backend | **Não.** API devolve o texto gravado. Cliente monta a URL (web 012 / mobile 014). |
| 8 | Número da spec | **011** no backend. Web **012**. Mobile **014**. |

### Ponto 1 — por que na conta e não no animal

O telefone é dado da pessoa/ONG (cadastro/perfil). Duplicar no `Animal` dessincroniza quando a conta muda o número. O responsável do registro **já** é `idUsuario` XOR `idInstituicao`.

### Ponto 2 — por que a ONG ganha `contato`

Sem o campo, “ONG responsável / ONG Testeeee” não tem WhatsApp. O seed (Thor, Luna) e o cadastro de adoção no painel são da instituição. Adiar de novo deixaria a feature só para `status=E` do usuário.

### Ponto 4 — por que o mesmo include

Hoje um único `animalInclude` alimenta lista e detalhe. Dois `select` (lista magra / detalhe com telefone) duplica mapper e risco de esquecer o campo num dos GETs. O telefone já é público no detalhe; escondê-lo na lista não é privacidade real (o id está na lista e o GET por id é público).

### Ponto 7 — por que o cliente monta o `wa.me`

A API não conhece o copy da mensagem nem o esquema (`https://wa.me/` vs `whatsapp://`). Prefixo `55` e `encodeURIComponent` do texto são regra de UI. O backend só persiste o que a conta já guarda.

## Fluxos

### Detalhe (clientes)

```
Interessado          App/Web                      API
 |  abre detalhe      |                            |
 |------------------->|  GET /animais/:id          |
 |                    |--------------------------->|
 |                    |  200 { animal.tutor.contato }
 |  ícone WhatsApp    |<---------------------------|
 |  toque             |  abre wa.me (cliente)      |
```

A API **não** redireciona para o WhatsApp.

### Cadastro ONG (delta)

Igual spec 003, com `contato` no body. Sem o campo → 400. Com sucesso → `ong.contato` na resposta.

## Regras de negócio (API)

1. Não gravar `contato` no `Animal`.
2. Não devolver `email` / `senha` em `usuario` / `instituicao` do GET de animais.
3. Cadastro ONG sem `contato` (vazio/ausente) → 400.
4. PATCH ONG com `contato` vazio (`""`) → 400 (`contato é obrigatório`), igual `optionalTrimmedString` do usuário. Omitir o campo = não muda.
5. Não logar JWT.
6. GET de animais permanece público.

## Arquitetura de código

```
prisma/schema.prisma                          # Instituicao.contato String? @db.VarChar(20)
prisma/migrations/…_instituicao_contato/
prisma/seed.js                                # ong.contato
src/services/animais.service.js               # animalInclude +contato
src/services/auth.service.js                  # cadastrarOng exige contato
src/services/ongs.service.js                  # aceitar contato no PATCH
src/services/contas.mappers.js                # ongPublica.contato
docs/postman/AdoPet-Auth-Animais.postman_collection.json
docs/CONTEXTO-PROJETO.md
```

Camadas inalteradas: rotas → controllers → services → Prisma. Sem SQL cru. Sem lib nova.

## Decisões técnicas

| Item | Escolha |
|------|---------|
| Canal | Backend (API) |
| Schema | `Instituicao.contato` opcional `VarChar(20)` |
| Cadastro ONG | `contato` obrigatório |
| PATCH `/ongs/me` | aceita `contato` |
| GET animais | `usuario.contato` + `instituicao.contato`; sem e-mail |
| Include | um só (lista e detalhe) |
| `wa.me` | cliente, não a API |
| Número | **011** |

## Critérios de pronto (após implementação)

- [x] Pontos 1–8 fechados nesta spec
- [x] Migration aplicada; `Instituicao` tem `contato`
- [x] Seed: ONG `51888888888`; usuário permanece `51999999999`
- [x] `GET /animais/1` (Thor) → `instituicao.contato` preenchido; `usuario` null
- [x] `GET /animais` (Mel) → `usuario.contato` preenchido
- [x] GET de animal **não** traz `email` do tutor
- [x] `POST /auth/ongs/cadastro` sem `contato` → 400
- [x] Cadastro ONG com `contato` → 201 e o campo na resposta
- [x] `PATCH /ongs/me` com `contato` → 200 (deixa de ser 400)
- [x] Login ONG devolve `contato` no objeto `ong`
- [x] CONTEXTO + Postman atualizados
- [x] Web 012 e mobile 014 **não** entram nesta fatia de código

## Como validar (após implementação)

Pré-requisito: API + migrate + seed.

```bash
cd D:\adopet-backend
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

1. `GET http://localhost:3000/animais/1` → Thor, `instituicao.contato` = `51888888888`
2. `GET http://localhost:3000/animais` → Mel com `usuario.contato` = `51999999999`
3. Conferir que `usuario`/`instituicao` **não** têm `email`
4. `POST /auth/ongs/cadastro` sem `contato` → 400
5. Login `ong@adopet.local` / `senha123` → `ong.contato` presente
6. `PATCH /ongs/me` `{ "contato": "51977777777" }` com JWT da ONG → 200 e valor novo

## Checklist de implementação (após a autora pedir o código)

1. [x] Spec 011 no índice backend
2. [x] Migration `Instituicao.contato`
3. [x] `ongPublica` + cadastro ONG + PATCH
4. [x] `animalInclude`
5. [x] Seed
6. [x] Postman
7. [x] CONTEXTO

## Relação com outras specs

- **005:** o GET já existia; esta fatia só alarga o `select` do tutor.
- **003 / 009:** `contato` na instituição deixa de ser “não inventar” / 400.
- **Web 012 / mobile 014:** consomem este contrato; montam o ícone e o `wa.me`.
- **Web 005 / 008:** cadastro e perfil da ONG no painel passam a ter o campo (web 012).
