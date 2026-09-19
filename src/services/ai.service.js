const { AppError } = require('../errors/AppError');

function getConfig() {
  const url = process.env.AI_SERVICE_URL;
  const secret = process.env.AI_SERVICE_SECRET;
  if (!url || !secret) {
    throw new AppError('Serviço de comparação indisponível', 503);
  }
  return { url: url.replace(/\/$/, ''), secret };
}

/*mede o quão parecidos são dois embeddings*/
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) {
    return 0;
  }
  return dot / denom;
}

function arredondarScore(score) {
  const n = Math.round(Number(score) * 10000) / 10000;
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(1, Math.max(-1, n));
}

async function gerarEmbedding(file) {
  const { url, secret } = getConfig();
  if (!file?.buffer?.length) {
    throw new AppError('imagem é obrigatório');
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || 'image/jpeg',
  });
  form.append('imagem', blob, file.originalname || 'imagem.jpg');

  let res;
  try {
    res = await fetch(`${url}/embed`, {
      method: 'POST',
      headers: { 'X-AI-Service-Secret': secret },
      body: form,
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    console.error(err);
    throw new AppError('Serviço de comparação indisponível', 503);
  }

  if (res.status === 401) {
    throw new AppError('Serviço de comparação indisponível', 503);
  }

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    const msg = payload?.detail || payload?.error?.message;
    if (res.status === 400) {
      throw new AppError(typeof msg === 'string' ? msg : 'imagem inválida');
    }
    console.error(payload);
    throw new AppError('Serviço de comparação indisponível', 503);
  }

  const embedding = payload.embedding;
  if (!Array.isArray(embedding) || embedding.length < 8) {
    throw new AppError('Serviço de comparação indisponível', 503);
  }
  return embedding;
}

async function tentarEmbedding(file) {
  try {
    return await gerarEmbedding(file);
  } catch (err) {
    console.error(err);
    return null;
  }
}

module.exports = {
  cosineSimilarity,
  arredondarScore,
  gerarEmbedding,
  tentarEmbedding,
};