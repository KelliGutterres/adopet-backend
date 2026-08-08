# Spec 005 — CRUD de Animais (API)

> **Status:** aprovada e implementada.  
> Cards Trello:
> - [Cadastrar Animal → POST /animais](https://trello.com/c/PTuRAaT3/40-cadastrar-animal-post-animais)
> - [Listar Animais → GET /animais e GET /animais/:id](https://trello.com/c/nK7l5UR4/41-listar-animais-get-animais-e-get-animais-id)
> - [Editar Animais → PUT/PATCH /animais/:id](https://trello.com/c/r7NfdaSA/42-editar-animais-put-patch-animais-id)
> - [Excluir Animais → DELETE /animais/:id](https://trello.com/c/fs7Nd32a/43-excluir-animais-delete-animais-id)

## Objetivo

Expor na API REST o **CRUD completo de animais** (criar, listar, detalhar, editar, excluir), com autenticação JWT e autorização por papel (`usuario` | `ong`), cobrindo RF0003, RF0004 (listagem básica) e RF0006 (detalhe básico).

## Escopo

1. Migration Prisma: `especie`, `idade`, `porte`, `idUsuario` em `Animal`
2. Endpoints: `POST/GET/PUT/PATCH/DELETE /animais` (+ `GET /animais/:id`)
3. Camadas: `animais.routes` → `animais.controller` → `animais.service` → Prisma
4. `authenticate` + `authorize('ong', 'usuario')` + regra de dono
5. Seed atualizado (Thor/Luna ONG + Mel usuário)
6. CONTEXTO atualizado

## Fora de escopo

- Upload / Supabase Storage
- Filtros avançados (RF0005) além de `?status=`
- Painel Web / Mobile
- CRUD de Cidade / Raça / Instituição
- IA / `Transacao`
- Soft-delete

## RF/RNF

| ID | Cobertura |
|----|-----------|
| RF0003 | CRUD completo (ambos os papéis) |
| RF0004 | Listagem básica + `?status=` |
| RF0006 | Detalhe por id (sem fotos) |
| RNF0002 | Mutações com JWT |

## Modelo de dados (delta)

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|--------|
| `especie` | `VarChar(40)` | sim | `CAO` \| `GATO` |
| `idade` | `Int?` | não | anos (>= 0) |
| `porte` | `Char(1)?` | não | `P` \| `M` \| `G` |
| `idUsuario` | `Int?` FK | não | dono quando criador é `usuario` |

`status` permanece `E` \| `P` \| `A` (situação).

## Autorização

| Operação | Auth |
|----------|------|
| `GET /animais`, `GET /animais/:id` | **Público** |
| `POST` / `PUT` / `PATCH` / `DELETE` | JWT + `authorize('ong','usuario')` + **dono** |

| Papel | Ao criar | Editar/excluir |
|-------|----------|----------------|
| `ong` | `idInstituicao = auth.id`; `idUsuario = null` | `idInstituicao === auth.id` |
| `usuario` | `idUsuario = auth.id`; `idInstituicao = null` | `idUsuario === auth.id` |

## Contratos

- Body create/update: `nome`, `status`, `descricao`, `especie`, `idade?`, `porte?`, `idCidade`, `idRaca`
- Dono **não** vem do body (JWT)
- `POST` → **201** `{ animal }`
- `GET` → **200** `{ animais }` / `{ animal }` (includes: cidade, raca, instituicao, usuario — só id+nome)
- `PUT`/`PATCH` → update parcial → **200** `{ animal }`
- `DELETE` → **204**; **409** se houver `Transacao`

## Decisões fechadas na implementação

1. Ambos os papéis com CRUD completo + `idUsuario`
2. GET público
3. `especie` enum `CAO`/`GATO`; `idade` anos opcional; `porte` P/M/G opcional
4. PUT e PATCH (mesmo update parcial)
5. DELETE 204; bloqueia se Transacao
6. Status livre para ambos
7. Filtro `?status=` sim; sem paginação
8. Seed: 3 animais (Mel do usuário)
9. Resposta instituicao/usuario: id + nome

## Arquivos

```
prisma/schema.prisma
prisma/migrations/20260808203000_animal_crud_fields/
prisma/seed.js
src/services/animais.service.js
src/controllers/animais.controller.js
src/routes/animais.routes.js
src/routes/index.js
```

## Critérios de pronto

- [x] Spec aprovada / decisões fechadas
- [x] Migration aplicada
- [x] Seed atualizado
- [x] CRUD com JWT ONG e usuário
- [x] GET list/detail públicos
- [x] Dono cruzado → 403
- [x] DELETE 204
- [x] CONTEXTO atualizado
- [x] Cards Trello 40–43 em Concluído
