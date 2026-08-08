# Spec 004 — Seed básico (cidade, ONG, usuário, animais)

> **Status:** aprovada e implementada.  
> Card Trello: [Criar o Seed básico: 1 ONG, 1 usuário, 1–2 animais](https://trello.com/c/K3vrNNcr/32-criar-o-seed-b%C3%A1sico-1-ong-1-usu%C3%A1rio-1-2-animais)

## Objetivo

Popular o banco local `adopet` com dados mínimos para desenvolvimento e testes manuais (login + listagens futuras), sem depender de cadastro manual via API.

## Escopo (esta tarefa)

1. Script Prisma Seed (`prisma/seed.js`)
2. Configurar `prisma.seed` no `package.json` + script npm (`prisma:seed` ou `db:seed`)
3. Dados mínimos:
   - 1 **Cidade** (FK exigida por Usuario / Instituicao / Animal)
   - 1 **Raca** (FK obrigatória de Animal)
   - 1 **Usuario** (com `email`/`senha` hash — spec 003)
   - 1 **Instituicao** / ONG (com `email`/`senha` hash)
   - **2 Animais** (card pede 1–2; proposta: 2)
4. Documentar credenciais de seed em `docs/` ou no final desta spec (não commitar senhas reais de produção)
5. Atualizar `docs/CONTEXTO-PROJETO.md` (decisão: seed local)

## Fora de escopo

- Endpoints CRUD de animais / cidades / raças
- Ampliar schema de Animal (espécie, porte, situação…) — continua MER atual
- Seed de `Transacao` (IA)
- Reset automático do banco em CI
- Dados para ambiente de produção

## RF/RNF relacionados

- Apoio a RF0001–RF0003, RF0009–RF0010 (dados para exercitar auth e futuro CRUD)
- RNF0002: senhas do seed **sempre** com hash bcrypt (mesmo custo da auth, factor `10`)

## Dados propostos

| Entidade | Conteúdo sugerido |
|----------|-------------------|
| Cidade | Lajeado / RS / Brasil (endereço genérico) |
| Raca | “Vira-lata” + descrição curta |
| Usuario | `usuario@adopet.local` / senha `senha123` / status `A` / contato fictício |
| Instituicao | `ong@adopet.local` / senha `senha123` / nome “ONG AdoPet Demo” |
| Animal 1 | Nome “Thor”, status `A` (adoção), descrição curta, ligado à ONG + cidade + raça |
| Animal 2 | Nome “Luna”, status `P` (perdido), descrição curta, ligado à ONG + cidade + raça |

### Status do Animal (`Char(1)` — decisão fechada)

| Código | Significado |
|--------|-------------|
| `E` | Encontrado |
| `P` | Perdido |
| `A` | Adoção |

O seed usa pelo menos `A` e `P`. O valor `E` fica documentado para o CRUD (não obrigatório criar um 3º animal só por isso).

> **Nota:** o `status` de **Usuario** (`A` ativo / `I` inativo, etc.) é outro campo — não confundir com o status do Animal.

### Credenciais (dev only)

| Papel | E-mail | Senha |
|-------|--------|-------|
| usuario | `usuario@adopet.local` | `senha123` |
| ong | `ong@adopet.local` | `senha123` |

Login via endpoints da spec 003 (`POST /auth/usuarios/login`, `POST /auth/ongs/login`).

## Comportamento do seed

### Estratégia proposta: **idempotente por e-mail / chave natural**

- Se já existir Usuario/ONG com o e-mail do seed → **não duplicar**; atualizar senha hash opcionalmente ou pular
- Cidade: buscar por `nome`+`uf` ou criar
- Raca: buscar por `nome` ou criar
- Animais: criar só se a ONG ainda não tiver os 2 nomes do seed — **[A REFINAR]**

Alternativa (mais agressiva): apagar dados de seed conhecidos e recriar (`deleteMany` filtrado). Preferível só em DB local vazio.

### Como rodar

```powershell
cd D:\adopet-backend
npx prisma db seed
# ou
npm run prisma:seed
```

Config Prisma (package.json):

```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

## Arquitetura

```
prisma/
  schema.prisma
  seed.js          # novo
  migrations/
```

- Usar `@prisma/client` + `bcryptjs` (já no projeto)
- Sem SQL cru
- Não logar hash completo; pode logar “seed ok” + e-mails criados

## Decisões técnicas (propostas)

| Item | Proposta | Refinar? |
|------|----------|----------|
| Arquivo | `prisma/seed.js` (CommonJS) | |
| Qtd. animais | 2 | |
| Senhas | hash bcryptjs, texto `senha123` só no script | |
| Domínio e-mail | `@adopet.local` (óbvio que é fake) | |
| Idempotência | upsert / find+create por e-mail | sim |
| Limpar DB antes | **Não** (não destrutivo) | sim |
| Cidade/Raca no card | Implícitas (necessárias pelas FKs) — incluir no seed | |
| Status Animal | `E` encontrado, `P` perdido, `A` adoção | fechado |

## Pontos abertos para refinamento

Decisões na aprovação:

1. 2 animais — ok (Thor=`A`, Luna=`P`)
2. Seed **idempotente**
3. Ambos os animais ligados à ONG
4. 1 Cidade + 1 Raça
5. Credenciais na spec **e** no CONTEXTO
6. `prisma.seed` configurado (pode rodar no `migrate dev` local)

## Critérios de pronto

- [x] Spec aprovada
- [x] `prisma/seed.js` + `package.json` com `prisma.seed`
- [x] `npx prisma db seed` cria 1 cidade, 1 raça, 1 usuário, 1 ONG, 2 animais
- [x] Login com as credenciais do seed retorna JWT (usuário e ONG)
- [x] Senhas no banco estão hasheadas
- [x] CONTEXTO atualizado
- [x] Card Trello movido / concluído

## Checklist de implementação (após aprovação)

1. Escrever `prisma/seed.js`
2. Configurar `prisma.seed` + script npm
3. Rodar seed no DB local e validar login
4. Atualizar CONTEXTO + marcar card
