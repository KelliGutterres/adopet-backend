# Spec 002 — Prisma schema inicial + primeira migration

## Objetivo

Configurar o schema Prisma alinhado à **Figura 11 (MER)** e aplicar a **primeira migration** no banco local `adopet`, deixando o Prisma Client utilizável em `src/db`.

## Escopo (esta tarefa)

- Documentar MER em `docs/` (print Figura 11)
- Preencher `prisma/schema.prisma` com as 6 entidades do MER
- Rodar `prisma migrate dev` (ex.: `--name init`)
- Validar geração do Client (`prisma generate` implícito na migrate)
- Atualizar `docs/CONTEXTO-PROJETO.md` (seção 4.4 + decisão)

## Fora de escopo

- Auth JWT, endpoints CRUD, controllers
- Seed de dados
- Supabase Storage / upload real de imagens
- Ajustes de schema para campos de auth (e-mail/senha) — **próxima tarefa**

## RF/RNF relacionados

- Fundação para RF0001–RF0006, RF0008–RF0010
- RNF0002 (base de dados pronta para senhas com hash depois)

## Modelo (Figura 11)

| Entidade | PK | Atributos | FKs |
|----------|----|-----------|-----|
| Cidade | idCidade | nome(60), endereco(200), uf(2), pais(45) | — |
| Usuario | idUsuario | nome(150), contato(20), status(1) | idCidade → Cidade |
| Instituicao | idInstituicao | nome(100) | idCidade → Cidade |
| Raca | idRaca | nome(60), descricao(200) | — |
| Animal | idAnimal | nome(80), status(1), descricao(200) | idCidade, idInstituicao?, idRaca |
| Transacao | idTransacao | keyImageSent, keyImageCompared, dataBusca, scoreSimilarity | idAnimal → Animal |

### Relacionamentos (1:N)

- Cidade → Usuario, Instituicao, Animal
- Instituicao → Animal (linha tracejada no MER → **FK opcional**)
- Raca → Animal
- Animal → Transacao

## Decisões técnicas

| Item | Decisão |
|------|---------|
| Fonte da verdade | Figura 11 (MER Parte 1) |
| ORM | Prisma + PostgreSQL (`DATABASE_URL` no `.env`) |
| PKs | `Int` `@id @default(autoincrement())` |
| Strings | `String` com `@db.VarChar(n)` conforme MER |
| status | `String` `@db.Char(1)` |
| dataBusca | `DateTime` |
| scoreSimilarity | `Decimal` `@db.Decimal(5, 4)` (similaridade 0–1; MER diz DECIMAL(3) — precisão ampliada) |
| keys de imagem | `String` `@db.VarChar(200)` (referência/URL; blob fica no Storage depois) |
| Nomenclatura Prisma | models/campos em PT (camelCase); `@@map` / `@map` se precisar alinhar nomes SQL |
| Instituicao no Animal | `idInstituicao Int?` (opcional) |
| Cliente | já em `src/db/index.js` — sem mudança de pasta nesta tarefa |

## Lacunas vs requisitos (NÃO nesta tarefa — cards futuros)

O MER **não** cobre tudo do MVP/auth:

1. **Usuario / Instituicao:** sem `email` nem `senha` (hash) — bloqueiam RF0001, RF0002, RF0009
2. **Animal:** RF cita espécie, idade, porte, situação (adoção/perdido/encontrado), imagens — ausentes no MER
3. Papel JWT `usuario` \| `ong` — modelar depois (campo em entidades ou tabela de auth)

Estratégia: **migration 1 = MER fiel**; migration(s) seguintes = campos de auth e atributos de Animal.

## Critérios de pronto

- [x] Spec aprovada (este arquivo + card Trello)
- [x] `schema.prisma` com 6 models + relações
- [x] Migration `init` aplicada no DB `adopet`
- [x] `npx prisma studio` ou query simples confirma tabelas
- [x] CONTEXTO atualizado (MER detalhado)
- [x] Sem secrets no Git (`.env` ignorado)

## Como validar

```powershell
cd D:\adopet-backend
npx prisma migrate dev --name init
npx prisma studio
```

## Checklist de implementação

1. Salvar Figura 11 em `docs/mer-figura-11.png`
2. Escrever models no `schema.prisma`
3. `prisma migrate dev --name init`
4. Atualizar CONTEXTO §4.4 e tabela de decisões
5. Mover card Trello para Done / marcar completo
