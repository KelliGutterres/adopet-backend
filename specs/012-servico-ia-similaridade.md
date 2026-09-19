# Spec 012 — Serviço de IA (similaridade de imagens)

> **Status:** aprovada e implementada (2026-09-14). UI mobile: spec 016. Web fora.  
> Depende de: spec 010 (foto `urlImagem` no Storage); spec 005 (CRUD `/animais`); spec 003 (JWT).  
> Consomem: mobile spec 016 (aba Similaridade + botão P/E → `POST /animais/comparar`). Web ainda fora.  
> Fecha a pendência do CONTEXTO: pasta `ai/`, integração Node ↔ Python, escrita em `Transacao`.

O modelo **não é treinado no AdoPet**. Usa-se **ResNet50 pré-treinado na ImageNet** (PyTorch/`torchvision`) como extrator de características e **similaridade de cosseno** entre vetores. Sem fine-tune.

A UI do app (ativar câmera da lista e resultados) está na **mobile spec 016**.

Execução **local** (notebook ou VM Univates): CPU. Oracle Cloud ficou como plano B se a Univates não tiver RAM.

---

## Objetivo

Permitir que um usuário ou ONG autenticados **enviem uma foto** e recebam **animais perdidos/encontrados visualmente semelhantes**, com score. Cobre o **RF0008** no servidor. A UI do app está na **mobile spec 016**.

---

## Recorte vs o que já existe


| Fluxo                                         | Onde está                       | Nesta spec                                         |
| --------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| Foto de cadastro (`POST /animais/:id/imagem`) | spec 010                        | **acrescentar** geração do embedding após o upload |
| `DELETE /animais/:id/imagem`                  | spec 010                        | **zerar** o embedding                              |
| `GET /animais` público                        | spec 005 / 010 / 011            | **inalterado** — **não** devolver o vetor          |
| `Transacao` (MER)                             | schema; 409 no DELETE do animal | **passar a gravar** nas buscas                     |
| Pasta `ai/`                                   | CONTEXTO, vazia                 | **criar** FastAPI CPU                              |
| Botão câmera nas listas P/E                   | mobile spec 006                 | **fora** (UI depois)                               |
| Oracle / VM remota                            | conversa de hospedagem          | **fora** — `AI_SERVICE_URL` aponta para localhost  |


---

## Escopo (esta tarefa)

1. Serviço Python em `ai/`: FastAPI, ResNet50 ImageNet, CPU, `POST /embed` + `GET /health`
2. Coluna `Animal.embedding` (`Json?`) — vetor 2048; omitido em todo GET público
3. Cliente Node (`AI_SERVICE_URL` + `AI_SERVICE_SECRET`); cosseno no Node
4. Hook no upload/remoção da foto do cadastro
5. `POST /animais/comparar` (JWT, multipart `imagem`) → top candidatos P/E + linhas em `Transacao`
6. `.env.example`, README em `ai/`, CONTEXTO

---

## Fora de escopo

- Treinar / fine-tune modelo
- GPU, Oracle, Hugging Face, SageMaker
- Telas mobile/web (ativar câmera da lista, resultados na UI)
- Comparar animais de **adoção** (`A`)
- Guardar a foto da **busca** no Storage
- `pgvector`
- Envelope de erro novo
- Filtros avançados (RF0005)
- Testes automatizados
- Expor o FastAPI ao celular/navegador

---

## RF/RNF relacionados


| ID              | Cobertura nesta spec                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| RF0008          | **Sim** — comparação automática com fotos já cadastradas (P/E)                                  |
| RF0003 / RF0007 | Upload de cadastro passa a gerar embedding; canal câmera da **busca** continua no mobile depois |
| RF0004 / RF0006 | GET inalterado (sem vetor na listagem/detalhe)                                                  |
| RNF0002         | Python só o Node chama; secret compartilhado                                                    |
| RNF0005         | Embedding pré-computado no upload para não recalcular o catálogo a cada busca                   |


---

## Decisões desta rodada (2026-09-14)


| #   | Tema                    | Decisão                                                                                                                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Modelo                  | ResNet50 ImageNet (`IMAGENET1K_V1`), última camada removida, vetor 2048                                                  |
| 2   | Similaridade            | Cosseno no **Node**; Python só gera embedding                                                                            |
| 3   | Onde roda agora         | Processo local na porta **8000** (como a Univates faria na mesma máquina ou ao lado do Node)                             |
| 4   | Candidatos              | Só status `P` **e** `E` com foto e embedding; **não** `A`                                                                |
| 5   | Ranking                 | Até **5** resultados com score **≥ 0,50** (limiar “pouco parecido” do protótipo Colab)                                   |
| 6   | Foto da busca           | Não persiste no Storage; `keyImageSent` = `busca/{uuid}`                                                                 |
| 7   | `keyImageCompared`      | `animal/{idAnimal}` (uma foto por animal)                                                                                |
| 8   | IA fora do ar no upload | Foto **salva mesmo assim**; embedding fica `null` (log). Busca desses animais só entra depois de novo upload ou backfill |
| 9   | IA fora do ar na busca  | **503** `{ error: { message } }`                                                                                         |
| 10  | GET de animais          | `omit` do campo `embedding`                                                                                              |
| 11  | Upload vs embedding     | `POST /animais/:id/imagem` **grava `urlImagem` e responde**; ResNet50 roda **em background**. O cliente não espera a CPU (evita timeout de 20 s no mobile) |


---

## Contrato — serviço Python (interno)

Base: `http://127.0.0.1:8000`  
Header obrigatório: `X-AI-Service-Secret: {AI_SERVICE_SECRET}`  
Sem o secret correto → **401**.

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /embed`

`multipart/form-data`, campo `imagem` (JPEG/PNG/WebP).

**200**

```json
{ "embedding": [0.12, -0.03, "...2048 números"] }
```

**400** arquivo ausente/inválido · **401** secret · **500** falha no modelo

Pré-processamento: resize 224×224, tensor, **normalização ImageNet** (média/desvio do `ResNet50_Weights`). Inferência `torch.no_grad()`, CPU.

O Node **não** manda lista de candidatos ao Python.

---

## Contrato — API Node (pública ao app)

Envelope inalterado: sucesso com recurso; erro `{ error: { message } }`.

### `POST /animais/comparar`

- Auth: JWT `usuario` ou `ong`
- Body: `multipart/form-data`, campo `imagem` (mesmas regras da spec 010: JPEG/PNG/WebP, ≤ 8 MB)
- **Não** há `:id` — registrar **antes** de `GET /animais/:id` não é obrigatório neste verbo, mas a rota fica explícita `/comparar`

Query opcional:


| Query        | Padrão | Efeito                   |
| ------------ | ------ | ------------------------ |
| `limite`     | `5`    | 1–10                     |
| `minScore`   | `0.5`  | 0–1                      |
| `statusAlvo` | `P,E`  | Só `P`, só `E`, ou ambos |


**200**

```json
{
  "candidatos": [
    {
      "scoreSimilarity": 0.9123,
      "animal": { }
    }
  ]
}
```

`animal` no mesmo formato do `GET /animais/:id` (com `contato` do tutor, **sem** `embedding`).

Lista vazia: **200** `{ "candidatos": [] }` se ninguém passar o corte (catálogo vazio, só adoção, fotos sem embedding, scores baixos).

**400** arquivo inválido · **401** sem JWT · **503** Python inacessível ou secret/URL ausente

Efeitos: para cada item de `candidatos`, um `Transacao` (`dataBusca` = agora, `scoreSimilarity`, `idAnimal` do candidato, chaves acima).

### Upload de cadastro (já existente)

`POST /animais/:id/imagem`: grava `urlImagem` (e zera o embedding antigo), **responde 200**, e só então chama `POST /embed` em background. Quando o vetor chega, atualiza `embedding` se a URL da foto **ainda for a mesma**. Falha ou lentidão da IA **não** atrasa nem desfaz o upload.

`DELETE /animais/:id/imagem`: `embedding` → `null`.

JSON de create/update **rejeita** `embedding` no body.

---

## Dados

`Animal.embedding Json?` (JSON array de 2048 números). Não entra em seed.

`Transacao` inalterado no formato; esta fatia **escreve** linhas. `DELETE /animais/:id` continua **409** se houver transação.

---

## Como rodar local (Univates / notebook)

Dois processos:

1. API Node (`npm run dev`, porta 3000)
2. Python: `ai/` + venv + `uvicorn` porta 8000

`.env` do Node:

```
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_SECRET=dev-ai-secret
```

Primeira subida do Python **baixa** os pesos do ResNet50 (~100 MB). RAM útil: ~2–4 GB livres.

Na VM Univates: os mesmos dois processos (ou Docker `ai/Dockerfile`). Só muda o host se um dia a IA for para a Oracle (`AI_SERVICE_URL`).

---

## Critérios de pronto

- [x] `ai/` sobe em CPU; `GET /health` 200 com o secret
- [x] `POST /embed` devolve 2048 floats
- [x] Upload de foto preenche `embedding`; DELETE zera
- [x] GET `/animais` **não** inclui `embedding`
- [x] `POST /animais/comparar` com JWT + foto devolve ranking e grava `Transacao`
- [x] Python parado → comparar 503; upload da foto do animal ainda 200
- [x] CONTEXTO + `.env.example` atualizados

---

## Ordem de implementação

1. Spec (este arquivo)
2. `ai/` FastAPI
3. Migration `embedding`
4. `src/services/ai.service.js` + hook upload + `POST /comparar`
5. Docs

UI mobile = spec 016. Web ainda fora.