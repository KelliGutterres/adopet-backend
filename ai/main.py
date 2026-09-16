from __future__ import annotations

import io
import os

import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image
from torchvision.models import ResNet50_Weights, resnet50

SECRET = os.environ.get("AI_SERVICE_SECRET", "dev-ai-secret")
ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/octet-stream",
}

weights = ResNet50_Weights.IMAGENET1K_V1
preprocess = weights.transforms()
backbone = resnet50(weights=weights)
backbone.eval()
model = torch.nn.Sequential(*list(backbone.children())[:-1])

app = FastAPI(title="AdoPet IA", docs_url=None, redoc_url=None)


def assert_secret(header_value: str | None) -> None:
    if not header_value or header_value != SECRET:
        raise HTTPException(status_code=401, detail="secret inválido")


@app.get("/health")
def health(x_ai_service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret")):
    assert_secret(x_ai_service_secret)
    return {"status": "ok"}


@app.post("/embed")
async def embed(
    imagem: UploadFile = File(...),
    x_ai_service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret"),
):
    assert_secret(x_ai_service_secret)
    if imagem.content_type and imagem.content_type.lower() not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="tipo de arquivo inválido (use JPEG, PNG ou WebP)")

    data = await imagem.read()
    if not data:
        raise HTTPException(status_code=400, detail="imagem é obrigatório")

    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        tensor = preprocess(image).unsqueeze(0)
        with torch.no_grad():
            vector = model(tensor).squeeze().cpu().numpy().reshape(-1)
    except Exception as err:
        print(err)
        raise HTTPException(status_code=500, detail="falha ao gerar embedding") from err

    return {"embedding": [float(x) for x in vector.tolist()]}
