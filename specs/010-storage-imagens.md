# Spec 010 — Supabase Storage (imagens do animal)

> **Status:** aprovada e implementada.  
> Pontos 1–11 fechados em 2026-09-01 (pacote A, com desvios no 6 e no 7).  
> Depende de: spec 005 (CRUD `/animais`); spec 008 (`assertPodeMutar`: ONG muta qualquer animal, usuário só o próprio).  
> Fatias futuras: upload no painel web (card Fotos da spec 007) e câmera/galeria no mobile (RF0007). **Esta fatia é só API + Prisma + Storage.**  
> Fecha a pendência do CONTEXTO: “Integração Supabase Storage (upload/recuperação; salvar só URL/referência no PostgreSQL)”.

O PostgreSQL do AdoPet **não muda de lugar**. O projeto Supabase entra **somente** como Storage. Auth continua JWT do Node (`usuario` | `ong`). Web e mobile **não** recebem chave do Supabase.

---

## Objetivo

Permitir **uma foto por animal**, enviada pelo cliente autenticado, armazenada no **Supabase Storage**, com **URL no PostgreSQL**. Cobre o restante de **RF0003** / **RF0006** no servidor (atributo imagens/fotos) e **RNF0004**, sem quebrar o CRUD JSON já pronto.

Recuperação: `GET /animais` e `GET /animais/:id` (já públicos) passam a devolver `urlImagem`. O cliente só precisa da URL — não fala com o Supabase.

---

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| `POST` JSON `/animais` (sem arquivo) | spec 005 / 007 | **inalterado** — animal nasce sem foto |
| `PUT`/`PATCH` JSON (nome, status, cidade…) | spec 005 / 007 / 008 | **inalterado** — **não** aceitar URL inventada no body |
| `GET` listagem/detalhe público | spec 005 | **acrescentar** `urlImagem` (`null` se não houver) |
| `DELETE /animais/:id` | spec 005 / 008 | **também** apagar o objeto no bucket (se existir) |
| `assertPodeMutar` | spec 008 | **reusar** no upload/remoção da foto |
| IA / `Transacao.keyImageSent` | MER + fase 2 | **fora** — não misturar com a foto do cadastro |
| Telas web / mobile / câmera | web 007; mobile 006/007/008 | **fora** — specs seguintes consomem esta API |

---

## Escopo (esta tarefa)

1. Migration Prisma: `urlImagem` opcional em `Animal`
2. Cliente Storage no Node (`@supabase/supabase-js` + Secret no `.env`)
3. `POST /animais/:id/imagem` (`multipart/form-data`, campo `imagem`) e `DELETE /animais/:id/imagem`
4. Validação JPEG/PNG/WebP, máximo **8 MB**; path estável no bucket; substituir foto antiga
5. `GET` de animais inclui o campo; seed **sem** foto (`null`)
6. Postman + `docs/CONTEXTO-PROJETO.md` após implementação

---

## Fora de escopo

- Telas web / mobile (RF0007 no app; card Fotos no painel)
- Várias fotos por animal / galeria / tabela `Imagem`
- Foto de perfil (usuário ou ONG)
- Upload direto do browser/app ao Supabase (Publishable key)
- Auth, Postgres ou RLS “por usuário” do Supabase
- IA, pasta `ai/`, escrita em `Transacao`
- Envelope de erro novo
- Paginação, filtros avançados (RF0005)
- Foto obrigatória no cadastro
- Soft-delete
- Role `admin` no JWT
- Transformação/thumbnail no servidor (o cliente manda o arquivo pronto)

---

## RF/RNF relacionados

| ID | Cobertura nesta spec |
|----|----------------------|
| RF0003 | Animal passa a ter imagem (uma); upload autenticado |
| RF0004 | Listagem devolve a URL para o card |
| RF0006 | Detalhe devolve a URL da foto |
| RF0007 | **Parcial no servidor** — o canal (câmera/galeria) é mobile; aqui só o POST multipart |
| RNF0002 | Mutação com JWT; Secret só no Node |
| RNF0004 | Blob no Storage; banco só referência |

---

## Refinamento técnico

### Papéis do Supabase vs do AdoPet

| Peça | Quem usa | Papel |
|------|----------|--------|
| PostgreSQL local + Prisma | Node | Dados (incluindo `urlImagem`) |
| JWT AdoPet | Node + clientes | Quem pode mutar o animal |
| Bucket `animais` (público) | Node (Secret) escreve; qualquer um lê pela URL | Arquivo |
| Publishable key | **ninguém neste projeto** | — |

Bucket **público** casa com `GET /animais` público. Upload só no Node: a Secret ignora RLS. **Não** criar policy de `INSERT` para `anon`.

### Duas etapas (cadastro JSON + foto)

1. Cliente cria o animal (`POST /animais`) — igual hoje.
2. Cliente envia a foto (`POST /animais/:id/imagem`) com o mesmo JWT.
3. `GET` passa a trazer `urlImagem`.

Web e mobile podem, na UI, parecer um único “Salvar”: duas chamadas em sequência.

### Onde o arquivo mora

Bucket: env `SUPABASE_BUCKET` (dev: `animais`).

Path **dentro** do bucket:

```text
{idAnimal}/{uuid}.{ext}
```

Extensão pelo MIME (`jpg` / `png` / `webp`), não pelo nome original.

URL pública via `getPublicUrl`.

### Libs e parsing

- `@supabase/supabase-js` — `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`
- `multer` com `memoryStorage()` — só nas rotas de imagem
- Campo do form: **`imagem`**
- JWT **antes** do multer (não bufferizar arquivo anônimo)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=animais
```

Env ausente ou falha do Storage no upload → **503** `Serviço de imagens indisponível`.

### Autorização (igual spec 008)

| Operação | Auth |
|----------|------|
| `GET` (`urlImagem` no animal) | público |
| `POST` / `DELETE .../imagem` | JWT + `authorize('ong','usuario')` + `assertPodeMutar` |

### Exclusão do animal

**409** se houver `Transacao`. Se o delete no Prisma ocorrer, tenta remover o objeto no bucket. Falha no Storage **não** impede o delete no banco.

### Substituição

Novo POST: sobe o arquivo novo, grava a URL, depois remove o objeto antigo (best-effort).

---

## Decisões fechadas na aprovação (2026-09-01)

| # | Decisão |
|---|---------|
| 1 | Uma foto; reenvio substitui |
| 2 | Só `urlImagem` no banco (`VarChar(500)?`) |
| 3 | `POST /animais/:id/imagem` separado do create JSON |
| 4 | Foto opcional (`null`) |
| 5 | `DELETE /animais/:id/imagem` |
| 6 | jpeg / png / webp; máximo **8 MB** (alinhado ao bucket no Supabase) |
| 7 | Campo multipart **`imagem`** |
| 8 | Recusar `urlImagem` / `keyImagem` no JSON (**400**) |
| 9 | Extensão pelo MIME |
| 10 | Só API (sem web/mobile nesta fatia) |
| 11 | Seed sem foto |

---

## Contrato

Envelope de erro inalterado: `{ "error": { "message": "..." } }`.

### Delta Prisma

```prisma
model Animal {
  // ...campos atuais
  urlImagem String? @db.VarChar(500)
}
```

Migration: `animal_url_imagem`. Animais existentes → `null`.

`urlImagem` entra no objeto `animal` de **todos** os GET/POST/PATCH JSON. O `POST`/`PATCH` JSON **não** aceitam esse campo no body.

### `POST /animais/:id/imagem`

**Content-Type:** `multipart/form-data`  
**Campo:** `imagem` (um arquivo)  
**Auth:** JWT + `ong` \| `usuario` + `assertPodeMutar`

| HTTP | Quando |
|------|--------|
| **200** `{ "animal": { …, "urlImagem": "https://…" } }` | ok (include igual ao GET) |
| **400** | sem arquivo; MIME inválido; arquivo > 8 MB; `id` inválido |
| **401** | sem JWT |
| **403** | usuário em animal de outro |
| **404** | animal não existe |
| **503** | env/Storage indisponível |

Mensagens (PT-BR):

- `imagem é obrigatório`
- `tipo de arquivo inválido (use JPEG, PNG ou WebP)`
- `imagem deve ter no máximo 8 MB`
- `Serviço de imagens indisponível`

Limite do multer → **400** (não 500).

### `DELETE /animais/:id/imagem`

**Auth:** igual ao POST.

| HTTP | Quando |
|------|--------|
| **204** | sem body. Animal **sem** foto também é **204** (idempotente) |
| **401** / **403** / **404** | iguais ao POST |

### `DELETE /animais/:id` (delta)

Inalterado o **409** por `Transacao`. Se o delete no Prisma ocorrer, tenta remover o objeto no bucket.

### `GET /animais` e `GET /animais/:id`

Públicos. `"urlImagem": null` ou a URL pública.

### Recusa no JSON

`POST` / `PUT` / `PATCH /animais` com `urlImagem` ou `keyImagem` no body → **400**.

---

## Arquitetura de código

```
prisma/schema.prisma
prisma/migrations/…_animal_url_imagem/

src/services/storage.service.js    # createClient, upload, remove, publicUrl
src/services/animais.service.js    # enviarImagem, removerImagem; excluir apaga objeto
src/controllers/animais.controller.js
src/middleware/uploadImagem.js     # multer: 8 MB, 1 arquivo, campo imagem
src/routes/animais.routes.js       # POST/DELETE /:id/imagem (JWT)

.env / .env.example
docs/postman/…
docs/CONTEXTO-PROJETO.md
```

Camadas: rotas → controllers → services → Prisma / Storage. Sem SQL cru.

`storage.service.js` **não** conhece JWT; quem chama já passou por `assertPodeMutar`.

---

## Regras de negócio

1. Imagem **não** é blob no PostgreSQL.
2. Secret / `service_role` **só** no servidor.
3. Uma foto por animal; a nova substitui a antiga.
4. Quem muta a foto é quem já pode mutar o animal (spec 008).
5. `GET` público pode mostrar a foto (bucket público).
6. Sem foto ≠ erro; `urlImagem` é `null`.
7. IA não lê este fluxo nesta fatia (`Transacao` intacta).

---

## Critérios de pronto (após aprovação + implementação)

- [x] Pontos 1–11 fechados nesta spec
- [x] Migration aplicada; GET de animal do seed traz `"urlImagem": null`
- [x] Login usuário + `POST /animais/:id/imagem` na **Mel** (arquivo jpeg < 8 MB) → **200** com URL que abre no browser
- [x] Mesmo usuário + POST no **Thor** (ONG) → **403**
- [x] Login ONG + POST na Mel → **200** (admin)
- [x] Segundo POST no mesmo id → URL nova; a antiga deixa de abrir (ou 404 no Storage)
- [x] `DELETE .../imagem` → **204**; GET seguinte → `urlImagem` null
- [x] POST sem arquivo / PDF / arquivo > 8 MB → **400**
- [x] `PATCH /animais/:id` `{ "urlImagem": "https://evil" }` → **400**
- [x] Sem JWT no POST imagem → **401**
- [x] `POST /animais` JSON **inalterado** (201 sem foto)
- [x] `DELETE /animais/:id` de animal **com** foto e **sem** Transacao → **204**; GET → 404
- [x] Postman atualizado
- [x] CONTEXTO: checklist Storage; §4.4 campo; decisão §8; pendência web/mobile fotos

Os critérios de HTTP acima são o contrato a validar localmente (Postman). A implementação entrega o comportamento; a autora confirma com o `.env` de Storage.

## Como validar

Pré-requisito: API + seed + `.env` de Storage + bucket `animais` público. JWT de `usuario@adopet.local` e `ong@adopet.local` (`senha123`).

1. `GET /animais/3` (Mel) → `urlImagem` null  
2. `POST /animais/3/imagem` com token **usuário**, form-data `imagem` = um `.jpg` → 200; abrir `urlImagem` no browser  
3. `POST /animais/1/imagem` (Thor) com token **usuário** → 403  
4. `POST /animais/3/imagem` com token **ONG** → 200  
5. `DELETE /animais/3/imagem` com token usuário → 204; GET → null  
6. `PATCH /animais/3` `{ "urlImagem": "http://x" }` → 400  

## Checklist de implementação (após aprovação)

1. [x] Fechar pontos 1–11 nesta spec + índice no `specs/README.md`
2. [x] Migration + schema
3. [x] `storage.service.js` + multer
4. [x] Rotas POST/DELETE imagem; recusa no JSON; delete do animal limpa o bucket
5. [x] Dependências `multer` e `@supabase/supabase-js`
6. [x] Postman
7. [x] CONTEXTO
8. [x] **Não** implementar web/mobile nesta fatia
