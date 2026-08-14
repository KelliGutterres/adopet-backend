# Spec 007 — Cidade e raça informadas no cadastro (find-or-create)

> **Status:** aprovada e implementada.  
> Depende de: spec 003 (cadastro usuário/ONG) e spec 005 (CRUD animais).  
> Fecha o ponto aberto da spec 003: cidade criada **inline** (find-or-create), sem exigir ID prévio.

## Objetivo

Permitir que **usuário** e **ONG** informem **cidade** (e **raça**, no animal) **no próprio cadastro**, em texto. A API **reutiliza** o registro se já existir ou **cria** um novo. Não haverá tela no painel para cadastrar cidades nem raças.

Fluxo de produto:

1. Pessoa preenche cadastro (conta ou animal) e digita cidade (nome + UF).
2. No animal, também digita o nome da raça.
3. A API resolve o FK (`idCidade` / `idRaca`) e grava o vínculo.
4. O MER (tabelas `Cidade` e `Raca`) permanece; o cliente **não** precisa conhecer IDs do seed.

Esta fatia é **só API**. Telas web/mobile ficam para specs nos outros repos.

## Escopo

1. Trocar `idCidade` por objeto `cidade` nos cadastros de usuário, ONG e animal (criar e editar).
2. Trocar `idRaca` por objeto `raca` no criar/editar animal.
3. Serviço compartilhado de **find-or-create** (sem rotas CRUD de cidade/raça).
4. Unique no banco para não duplicar a mesma cidade/raça.
5. Atualizar Postman e `docs/CONTEXTO-PROJETO.md` após aprovação + implementação.

## Fora de escopo

- Painel web / telas mobile
- `GET /cidades` e `GET /racas` (autocomplete) — opcional em spec futura
- CRUD administrativo de Cidade / Raça
- IBGE, ViaCEP, lista oficial de municípios
- Edição de perfil (nome, contato, e-mail) — continua fora, como na spec 006
- Filtros avançados (RF0005) além do `?status=` já existente
- Storage / IA

## RF/RNF

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0001 | Cadastro de usuário informa cidade sem ID prévio |
| RF0003 | Cadastro/edição de animal informa cidade e raça sem ID prévio |
| RF0009 | Cadastro de ONG informa cidade sem ID prévio |
| RF0005 | **Indireto** — cidade continua normalizada, o que permite filtrar por localização depois |

## Contexto técnico (hoje)

| Endpoint | Cidade / raça |
|----------|----------------|
| `POST /auth/usuarios/cadastro` | `idCidade` numérico; cidade **já deve existir** |
| `POST /auth/ongs/cadastro` | idem |
| `POST /animais` | `idCidade` + `idRaca` numéricos; ambos já devem existir |
| `PUT`/`PATCH /animais/:id` | idem se o campo vier no body |
| Seed | 1 cidade (Lajeado/RS) e 1 raça (Vira-lata) |

Não há unique em `Cidade(nome, uf)` nem em `Raca(nome)`. Duas pessoas digitando “Lajeado” + “RS” podem gerar linhas duplicadas se a busca falhar (corrida) ou for só por texto solto.

`Cidade.endereco` e `Cidade.pais` são **obrigatórios** no schema (MER). Quem só informa município não tem o que preencher em `endereco`.

## Proposta de contrato

O cliente **não envia** `idCidade` nem `idRaca`. Envia texto. A API devolve os IDs (e o objeto) na resposta, como já faz no GET de animal.

### Objeto `cidade` (entrada)

```json
{
  "nome": "Lajeado",
  "uf": "RS"
}
```

| Campo | Regra proposta |
|-------|----------------|
| `nome` | obrigatório; trim; 1–60 chars |
| `uf` | obrigatório; 2 letras; gravar **maiúsculo** |
| `pais` | **não** enviar no MVP; gravar `"Brasil"` |
| `endereco` | **não** enviar no MVP; gravar `"-"` (o MER exige o campo; não é endereço da pessoa) |

### Objeto `raca` (entrada)

```json
{
  "nome": "SRD"
}
```

| Campo | Regra proposta |
|-------|----------------|
| `nome` | obrigatório; trim; 1–60 chars |
| `descricao` | **não** enviar no MVP; gravar o mesmo `nome` (o MER exige o campo) |

### `POST /auth/usuarios/cadastro`

**Body** (demais campos iguais à spec 003)

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "senha": "senha123",
  "contato": "51999999999",
  "cidade": { "nome": "Lajeado", "uf": "RS" }
}
```

**201** — `usuario` inclui `idCidade` e `cidade: { idCidade, nome, uf }` (sem `endereco` na resposta, salvo se formos expor). Token inalterado.

**400** se `cidade` ausente, `nome`/`uf` inválidos.

### `POST /auth/ongs/cadastro`

Mesmo objeto `cidade` no lugar de `idCidade`.

### `POST /animais`

**Body** (demais campos iguais à spec 005)

```json
{
  "nome": "Thor",
  "status": "A",
  "descricao": "Cachorro dócil",
  "especie": "CAO",
  "idade": 3,
  "porte": "M",
  "cidade": { "nome": "Lajeado", "uf": "RS" },
  "raca": { "nome": "SRD" }
}
```

**201** — `animal` já inclui `cidade` e `raca` (hoje só id+nome no include). Manter esse include.

### `PUT` / `PATCH /animais/:id`

Update parcial: se vier `cidade`, resolve find-or-create e atualiza FK. Se vier `raca`, idem. Se não vier, não mexe. **Não** aceitar mais `idCidade` / `idRaca` no body.

## Regras de find-or-create

Chave de cidade: **`nome` + `uf`** (e `pais = Brasil` implícito).  
Chave de raça: **`nome`**.

1. Normalizar: trim; `uf` → uppercase; comparação de `nome` **case-insensitive**.
2. Buscar registro existente com essa chave.
3. Se existir → usar o `id`.
4. Se não → `create` com defaults (`pais`, `endereco` / `descricao`).
5. Unique no Prisma para a chave, para duas requisições simultâneas não duplicarem.

**Acentos:** não normalizar (“São Leopoldo” ≠ “Sao Leopoldo”).  
**Maiúsculas em nome:** gravar o texto informado (após trim); a busca ignora case (`Lajeado` reutiliza `lajeado` se a linha já existir).  
**Unique:** `@@unique([nome, uf])` e `Raca.nome @unique` — simples, como no PostgreSQL (case-sensitive). A busca case-insensitive evita duplicar no fluxo normal.

## Modelo de dados (delta)

Migration:

```prisma
model Cidade {
  // campos atuais...
  @@unique([nome, uf])
}

model Raca {
  // campos atuais...
  @@unique([nome])
}
```

Seed: Lajeado/RS e Vira-lata continuam válidos; o unique não quebra o seed se já for a única linha.

## Arquitetura de código

Sem rotas novas. Extrair helper para não duplicar em auth e animais.

```
src/services/localidade.service.js   # findOrCreateCidade, findOrCreateRaca
src/services/auth.service.js         # cadastro usa o helper; para de exigir idCidade
src/services/animais.service.js      # criar/atualizar usam o helper
src/controllers/auth.controller.js   # body.cidade
src/controllers/animais.controller.js
prisma/schema.prisma                 # unique
prisma/migrations/…_cidade_raca_unique/
docs/postman/AdoPet-Auth-Animais.postman_collection.json
```

Camadas: rotas → controllers → services → Prisma.

## Compatibilidade

**Quebra o body anterior:** `idCidade` / `idRaca` **não** são aceitos (`400`). O cliente envia só `cidade` / `raca`. Postman atualizado; seed continua usando IDs internamente (não é API).

## Autorização

Inalterada: cadastros públicos; mutações de animal com JWT + dono (spec 005). Find-or-create **não** é um endpoint público solto — só ocorre dentro de cadastro/edição já existentes. Qualquer usuário autenticado (ou cadastro público) pode **criar** uma linha em `Cidade`/`Raca` como efeito colateral. Isso é desejado.

## Decisões fechadas na aprovação

| # | Decisão |
|---|---------|
| 1 | Cidade **e** raça nesta spec |
| 2 | Body só `{ nome, uf }`; `pais` **não** entra; gravar `"Brasil"` |
| 3 | `endereco` da Cidade: gravar `"-"` (MER permanece obrigatório) |
| 4 | Unique simples `@@unique([nome, uf])` e `Raca.nome @unique` + busca case-insensitive |
| 5 | Acentos: **ignorar** (não normalizar) |
| 6 | Quebrar `idCidade` / `idRaca` no body (`400` se enviados) |
| 7 | Cadastro/login usuário e ONG devolvem `cidade` aninhada (`idCidade`, `nome`, `uf`) |
| 8 | `GET /auth/me` **sem** cidade — continua `{ id, papel, email }` |

Unique simples = o banco recusa duas linhas com o **mesmo** `nome`+`uf` (texto idêntico). A API ainda procura ignorando maiúsculas, então o segundo cadastro em “lajeado/RS” reaproveita “Lajeado/RS”.

## Critérios de pronto

- [x] Spec aprovada (pontos 1–8 fechados)
- [x] Cadastro usuário com `cidade` nova → cria linha e vincula
- [x] Cadastro usuário com `cidade` já existente (ex. Lajeado/RS do seed) → **não** duplica
- [x] Cadastro ONG idem
- [x] POST/PUT animal com `cidade` + `raca` idem
- [x] Body com `idCidade` / `idRaca` → `400`
- [x] `cidade` ou `raca` inválida → `400`
- [x] Unique no schema; seed continua ok
- [x] Postman atualizado
- [x] `docs/CONTEXTO-PROJETO.md` atualizado (decisão na tabela §8; ponto aberto da 003 fechado)

## Como validar (depois de implementar)

```bash
# cidade nova no cadastro
curl -X POST http://localhost:3000/auth/usuarios/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@email.com","senha":"senha123","contato":"51999999999","cidade":{"nome":"Estrela","uf":"RS"}}'

# mesma cidade de novo → mesmo idCidade, uma linha só em Cidade
curl -X POST http://localhost:3000/auth/ongs/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"ONG Estrela","email":"ong.estrela@email.com","senha":"senha123","cidade":{"nome":"Estrela","uf":"rs"}}'
```

## Checklist de implementação (após aprovação)

1. Migration unique
2. `localidade.service.js` (find-or-create)
3. Auth + animais: body novo
4. Postman
5. CONTEXTO
6. Não criar spec web/mobile nesta fatia
