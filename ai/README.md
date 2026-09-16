# AdoPet IA (similaridade)

Serviço Python interno: **ResNet50 ImageNet** (extrator) + embedding 2048. O Node calcula o cosseno e grava `Transacao`.

Não exponha esta porta ao celular nem ao navegador.

## Local (notebook / VM Univates)

Python 3.11 ou 3.12. Na primeira execução o PyTorch baixa os pesos (~100 MB). Reserve ~2–4 GB de RAM.

```powershell
cd ai
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
$env:AI_SERVICE_SECRET="dev-ai-secret"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Linux / Univates:

```bash
cd ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_SERVICE_SECRET=dev-ai-secret
uvicorn main:app --host 0.0.0.0 --port 8000
```

`GET http://127.0.0.1:8000/health` com header `X-AI-Service-Secret: dev-ai-secret`.

No `.env` do Node:

```
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_SECRET=dev-ai-secret
```

Suba a API (`npm run dev`) **e** este processo. A busca `POST /animais/comparar` só funciona com os dois no ar.

## Docker (opcional)

Na raiz do `adopet-backend`:

```bash
docker compose up ai
```

## Oracle

Se a Univates não tiver RAM, aponte `AI_SERVICE_URL` para a VM Oracle (mesmo código, imagem `linux/arm64` na A1).
