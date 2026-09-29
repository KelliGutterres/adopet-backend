# Spec 014 — Métricas do dashboard

> **Status:** aprovada e implementada (2026-09-28).  
> Depende de: spec 005 (CRUD `/animais`) e spec 008 (ONG exclui qualquer animal).  
> Consumida pelo painel web (web spec 015). O mobile não tem tela de dashboard.

---

## Objetivo

Entregar à ONG, em um único endpoint, as contagens do painel:

- animais **para adoção**, **encontrados** e **perdidos** cadastrados no período;
- animais **adotados** no período, medidos pelas exclusões de animais que estavam para adoção.

---

## Recorte vs o que já existe

| Fluxo | Onde está | Nesta spec |
|-------|-----------|------------|
| CRUD e exclusão de animal | specs 005 e 008 | **estender** `excluir`: gravar a saída antes do `delete` |
| Listagem `GET /animais` | spec 005 | **inalterada** — o JSON do animal não ganha `criadoEm` |
| Auth JWT `ong` | spec 003 | **reutilizar** `authenticate` + `authorize('ong')` |
| Tela do painel | web spec 015 | fora daqui |

---

## Decisões

1. **Período** é uma janela rolante a partir de agora:
   - `7d` — 7 dias
   - `30d` — 1 mês (30 dias)
   - `90d` — 3 meses (90 dias)
   - omitido → `7d`
   - outro valor → 400
2. **Cadastrados** = animais que ainda existem, com `criadoEm` dentro da janela, agrupados pelo `status` atual (`A`, `E`, `P`).
3. **Adotados** = registros de exclusão com `status` `A` e `excluidoEm` dentro da janela. Excluir um animal encontrado ou perdido não conta como adoção.
4. A exclusão (ONG ou usuário dono) grava o registro **na mesma transação** do `delete`. Se o delete falhar (ex.: transações de similaridade, 409), nada é gravado.
5. Exclusões feitas antes desta spec não existem no banco e não entram na conta.
6. Animais já existentes recebem `criadoEm` no momento da migration (`DEFAULT now()`). Eles aparecem nos três períodos até a janela passar dessa data.
7. `criadoEm` não sai no JSON de `/animais` (removido junto com `embedding` em `semEmbedding`).

---

## Modelo

`Animal.criadoEm` — `DateTime`, obrigatório, default `now()`. Índice `(status, criadoEm)`.

`ExclusaoAnimal`:

| Campo | Tipo | Notas |
|-------|------|--------|
| `idExclusao` | int PK | autoincrement |
| `status` | char(1) | status do animal no momento da exclusão |
| `excluidoEm` | DateTime | default `now()` |

Índice `(status, excluidoEm)`. Sem FK para `Animal`: a linha do animal deixa de existir.

---

## Contrato

`GET /dashboard?periodo=7d|30d|90d`

- Auth: JWT com papel `ong`. `usuario` → 403. Sem token → 401.
- 200:

```json
{
  "metricas": {
    "periodo": "7d",
    "adocao": 0,
    "encontrados": 0,
    "perdidos": 0,
    "adotados": 0
  }
}
```

Os quatro números são inteiros `>= 0`.

---

## Fora de escopo

- Gráficos, exportação e totais “desde sempre” sem filtro.
- Contar exclusão de usuário, de foto ou de animal encontrado/perdido como adoção.
- Alterar o mobile.
- Reescrever specs anteriores de CRUD.

---

## Critérios de pronto

- [x] `GET /dashboard` com JWT de ONG devolve as quatro contagens do período.
- [x] Período ausente vale `7d`; valor inválido responde 400.
- [x] Papel `usuario` recebe 403.
- [x] Excluir um animal `A` aumenta `adotados` do período e tira o animal de `adocao`.
- [x] Excluir um animal `E` ou `P` não aumenta `adotados`.
- [ ] Falha de exclusão (409 por transação vinculada) não grava `ExclusaoAnimal`.
- [x] `GET /animais` continua sem o campo `criadoEm`.
