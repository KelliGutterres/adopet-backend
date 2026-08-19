# Specs (SDD)

Especificações obrigatórias **antes** de implementar (Spec-Driven Development).

## Regras

- Uma spec por feature/fatia relevante.
- Nome sugerido: `NNN-nome-curto.md` (ex.: `001-auth-jwt.md`).
- Conteúdo mínimo: objetivo, escopo, RF/RNF, contratos (API/UI), critérios de pronto, fora de escopo.
- Atualizar a spec se a decisão mudar durante a implementação.

Ver `docs/CONTEXTO-PROJETO.md` (seção SDD).

## Índice

| Spec | Tema | Status |
|------|------|--------|
| [001](./001-estrutura-inicial-backend.md) | Scaffold Express + Prisma | aprovada e implementada |
| [002](./002-prisma-schema-inicial.md) | Schema Prisma (MER) | aprovada e implementada |
| [003](./003-auth-jwt.md) | Auth JWT usuário e ONG | aprovada e implementada |
| [004](./004-seed-basico.md) | Seed local | aprovada e implementada |
| [005](./005-crud-animais.md) | CRUD `/animais` | aprovada e implementada |
| [006](./006-esqueci-senha.md) | Esqueci senha (usuário e ONG) | aprovada e implementada |
| [007](./007-cidade-raca-inline.md) | Cidade/raça find-or-create | aprovada e implementada |
| [008](./008-ong-admin-animais.md) | ONG edita/exclui qualquer animal | aprovada e implementada |
