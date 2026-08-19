# Spec 008 — ONG administra qualquer animal (API)

> **Status:** aprovada e implementada.  
> Depende de: spec 005 (CRUD `/animais` + dono); spec 003 (JWT `ong` \| `usuario`).  
> **Não** muda schema Prisma, body, seed nem rotas.  
> Fatia web correspondente: `adopet-web` spec 007.

## Objetivo

A ONG **é o administrador do painel** (contexto §1 e §4.5: administrar registros de animais no sistema). Hoje `PUT`/`PATCH`/`DELETE /animais/:id` só passam se o animal for **da própria instituição**. Isso bloqueia a ONG de editar/excluir um animal de usuário (ex.: Mel no seed).

Esta fatia altera **somente a autorização de mutação**: papel `ong` pode editar e excluir **qualquer** animal. Papel `usuario` continua restrito ao próprio.

Cobre **RF0003** / **RF0010** no servidor, para o painel web conseguir gerenciar a listagem completa (web spec 003: todos os tutores).

## Escopo

1. Trocar `assertDono` em atualizar/excluir: `ong` passa; `usuario` só se `idUsuario === auth.id`
2. **Não** transferir a posse: editar Mel **não** grava `idInstituicao` da ONG; `idUsuario` permanece
3. Atualizar `docs/CONTEXTO-PROJETO.md` (dono do Animal) após aprovação + implementação

## Fora de escopo

- Novos endpoints
- Soft-delete, envelope, Storage, IA
- Painel web / mobile (web spec 007)
- ONG reatribuir dono (`idUsuario` / `idInstituicao` **não** vêm no body — inalterado)
- Role `admin` separado no JWT

## RF/RNF

| ID | Cobertura |
|----|-----------|
| RF0003 | ONG (admin) mantém qualquer animal |
| RF0010 | Painel deixa de bater em 403 nos registros de usuário |
| RNF0002 | Mutações continuam com JWT; `usuario` não ganha poder extra |

## Autorização (delta da spec 005)

| Operação | Auth |
|----------|------|
| `GET /animais`, `GET /animais/:id` | **Público** (inalterado) |
| `POST /animais` | JWT + `authorize('ong','usuario')`; dono **no create** inalterado |
| `PUT` / `PATCH` / `DELETE /animais/:id` | JWT + `authorize('ong','usuario')` + regra abaixo |

| Papel | Ao criar (inalterado) | Editar / excluir (**novo**) |
|-------|------------------------|-----------------------------|
| `ong` | `idInstituicao = auth.id`; `idUsuario = null` | **qualquer** animal existente |
| `usuario` | `idUsuario = auth.id`; `idInstituicao = null` | só se `idUsuario === auth.id` |

Animal inexistente → **404** (antes da regra de papel).  
`usuario` em animal de outro (ONG ou outro usuário) → **403** `Acesso negado`.  
`DELETE` com `Transacao` → **409** (inalterado), inclusive quando a ONG exclui.

Contrato JSON, validação de campos e find-or-create de cidade/raça: **inalterados**.

## Arquitetura de código

```
src/services/animais.service.js   # assertDono → assertPodeMutar
```

Camadas inalteradas: rotas → controllers → services → Prisma. Sem migration.

## Decisões fechadas na aprovação (2026-08-19)

| # | Decisão |
|---|---------|
| 1 | `ong` edita e exclui **qualquer** animal |
| 2 | `usuario` permanece só no próprio |
| 3 | Edição pela ONG **não** muda o tutor (FK de dono intacta) |
| 4 | Sem role `admin` no JWT |

## Critérios de pronto

- [x] Spec aprovada (junto com web 007)
- [x] Login ONG + `PATCH` no id da Mel → **200**
- [x] Login ONG + `DELETE` de um animal de usuário (sem Transacao) → **204**
- [x] Login usuário + `PATCH` no Thor (ONG) → **403**
- [x] Login usuário + `PATCH` na Mel → **200**
- [x] `PATCH` ONG na Mel **não** altera `idUsuario` / `idInstituicao`
- [x] CONTEXTO: dono do Animal atualizado (spec 005 + esta)

## Como validar (após implementação)

Pré-requisito: seed (`Mel` = usuário, `Thor`/`Luna` = ONG). JWT de `ong@adopet.local` e `usuario@adopet.local`.

1. `PATCH /animais/3` (Mel) com token **ONG** → 200  
2. `PATCH /animais/1` (Thor) com token **usuário** → 403  
3. `GET /animais/3` após o PATCH da ONG → `usuario` ainda preenchido, `instituicao` null

## Checklist de implementação (após aprovação)

1. Spec 008 aprovada
2. `animais.service.js`: `assertPodeMutar`
3. CONTEXTO §4.4 dono + tabela §8
4. Implementar web spec 007 em seguida (ou em paralelo após o merge da regra)
