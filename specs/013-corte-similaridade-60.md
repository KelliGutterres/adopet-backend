# Spec 013 — Corte de 60% na comparação de similaridade

> **Status:** aprovada e implementada (2026-09-28).  
> Depende de: spec 012 (`POST /animais/comparar`, ranking no Node).  
> Consomem: web spec 013 e mobile spec 016 — as duas telas só listam o que a API devolve; não há filtro novo no cliente.

A spec 012 devolvia até **5** candidatos com score **≥ 0,50**. Esta fatia **sobe o corte padrão para 0,60**. O limite de cinco permanece.

---

## Objetivo

Na busca por foto (painel web e app mobile), continuar trazendo os **cinco maiores** scores, **somente** os que forem **≥ 60%**.

---

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| Ranking em `comparar` | spec 012 / `animais.service.js` | **alterar** o padrão de `minScore` de `0.5` para `0.6` |
| Query `limite` (padrão 5, máx. 10) | spec 012 | **inalterada** |
| Query `minScore` explícita (0–1) | spec 012 | **inalterada** — quem passar o valor continua podendo usar outro corte |
| `statusAlvo` `P,E` | spec 012 | **inalterado** |
| Modelo, embedding, `Transacao`, foto da busca | spec 012 | **inalterados** |
| Tabela web e cards mobile | web 013 / mobile 016 | **inalterados** — exibem `candidatos` |

`Transacao` só é gravada para os candidatos que passam no corte. Score abaixo de 0,60 não entra na resposta nem gera linha.

Lista vazia continua **200** `{ "candidatos": [] }` (mensagem já existente: “Nenhum animal semelhante encontrado.”).

---

## Escopo (esta tarefa)

1. `parseMinScore`: quando a query vem vazia, retornar **`0.6`**
2. O filtro existente `score >= minScore`, a ordenação decrescente e o `slice(0, limite)` permanecem
3. Atualizar o contrato da spec 012 (`minScore` padrão `0.6`) e o padrão citado na web spec 013 e na mobile spec 016
4. `docs/CONTEXTO-PROJETO.md`

---

## Fora de escopo

- Mudar o modelo, o cosseno ou o número máximo de resultados
- Filtrar de novo no web ou no mobile
- Expor controle de limiar na UI
- Alterar o formato de `scoreSimilarity` (continua 0–1; o cliente mostra `%`)

---

## Contrato

`POST /animais/comparar` — query opcional:

| Query | Padrão | Efeito |
|-------|--------|--------|
| `limite` | `5` | 1–10 |
| `minScore` | **`0.6`** | 0–1; entra quem tiver score **≥** esse valor |
| `statusAlvo` | `P,E` | Só `P`, só `E`, ou ambos |

Sem `minScore` na query (é o que web e mobile enviam hoje): no máximo 5 animais, todos com similaridade **≥ 60%**.

---

## Critérios de pronto

- [x] Busca sem `minScore` não devolve score `< 0.6`
- [x] Ainda devolve no máximo 5, do maior para o menor
- [x] Web e mobile sem mudança de tela
- [x] CONTEXTO atualizado

---

## Ordem de implementação

1. Spec (este arquivo)
2. Padrão `0.6` em `src/services/animais.service.js`
3. Spec 012, web spec 013, mobile spec 016 e CONTEXTO
