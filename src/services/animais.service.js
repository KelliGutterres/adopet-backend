const crypto = require('crypto');
const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');
const {
  findOrCreateCidade,
  findOrCreateRaca,
  rejeitarIdsLegados,
} = require('./localidade.service');
const { uploadImagemAnimal, removerObjeto } = require('./storage.service');
const {
  cosineSimilarity,
  arredondarScore,
  gerarEmbedding,
  tentarEmbedding,
} = require('./ai.service');

const STATUS_VALIDOS = new Set(['E', 'P', 'A']);
const ESPECIES_VALIDAS = new Set(['CAO', 'GATO']);
const PORTES_VALIDOS = new Set(['P', 'M', 'G']);

const animalInclude = {
  cidade: {
    select: {
      idCidade: true,
      nome: true,
      uf: true,
    },
  },
  raca: {
    select: {
      idRaca: true,
      nome: true,
    },
  },
  instituicao: {
    select: {
      idInstituicao: true,
      nome: true,
      contato: true,
    },
  },
  usuario: {
    select: {
      idUsuario: true,
      nome: true,
      contato: true,
    },
  },
};

function semEmbedding(animal) {
  if (!animal || typeof animal !== 'object') {
    return animal;
  }
  const { embedding: _embedding, ...rest } = animal;
  return rest;
}

function parseLimite(value) {
  if (value === undefined || value === null || value === '') {
    return 5;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new AppError('limite inválido (1 a 10)');
  }
  return n;
}

function parseMinScore(value) {
  if (value === undefined || value === null || value === '') {
    return 0.5;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new AppError('minScore inválido (0 a 1)');
  }
  return n;
}

function parseStatusAlvo(value) {
  if (value === undefined || value === null || value === '') {
    return ['P', 'E'];
  }
  if (typeof value !== 'string') {
    throw new AppError('statusAlvo inválido (use P, E ou P,E)');
  }
  const parts = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const allowed = new Set(['P', 'E']);
  if (parts.length === 0 || parts.some((p) => !allowed.has(p))) {
    throw new AppError('statusAlvo inválido (use P, E ou P,E)');
  }
  return [...new Set(parts)];
}

function parseId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('id inválido');
  }
  return n;
}

function requireString(value, field, maxLen) {
  if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${field} é obrigatório`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new AppError(`${field} deve ter no máximo ${maxLen} caracteres`);
  }
  return trimmed;
}

function validarStatus(status) {
  if (!status || typeof status !== 'string') {
    throw new AppError('status é obrigatório');
  }
  const norm = status.trim().toUpperCase();
  if (!STATUS_VALIDOS.has(norm)) {
    throw new AppError('status inválido (use E, P ou A)');
  }
  return norm;
}

function validarEspecie(especie) {
  if (!especie || typeof especie !== 'string') {
    throw new AppError('especie é obrigatória');
  }
  const norm = especie.trim().toUpperCase();
  if (!ESPECIES_VALIDAS.has(norm)) {
    throw new AppError('especie inválida (use CAO ou GATO)');
  }
  return norm;
}

function validarPorte(porte, { required = false } = {}) {
  if (porte === undefined || porte === null || porte === '') {
    if (required) {
      throw new AppError('porte é obrigatório');
    }
    return null;
  }
  if (typeof porte !== 'string') {
    throw new AppError('porte inválido');
  }
  const norm = porte.trim().toUpperCase();
  if (!PORTES_VALIDOS.has(norm)) {
    throw new AppError('porte inválido (use P, M ou G)');
  }
  return norm;
}

function validarIdade(idade, { required = false } = {}) {
  if (idade === undefined || idade === null || idade === '') {
    if (required) {
      throw new AppError('idade é obrigatória');
    }
    return null;
  }
  const n = Number(idade);
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError('idade inválida (anos, inteiro >= 0)');
  }
  return n;
}

function vinculoDoAuth(auth) {
  if (auth.papel === 'ong') {
    return { idInstituicao: auth.id, idUsuario: null };
  }
  if (auth.papel === 'usuario') {
    return { idInstituicao: null, idUsuario: auth.id };
  }
  throw new AppError('Papel inválido', 403);
}

function podeMutar(animal, auth) {
  if (auth.papel === 'ong') {
    return true;
  }
  if (auth.papel === 'usuario') {
    return animal.idUsuario === auth.id;
  }
  return false;
}

function rejeitarCamposImagemNoJson(body = {}) {
  if (body.urlImagem !== undefined) {
    throw new AppError(
      'urlImagem não é aceito neste endpoint; envie a foto em POST /animais/:id/imagem'
    );
  }
  if (body.keyImagem !== undefined) {
    throw new AppError('keyImagem não é aceito');
  }
  if (body.embedding !== undefined) {
    throw new AppError('embedding não é aceito neste endpoint');
  }
}

async function assertPodeMutar(idAnimal, auth) {
  const animal = await prisma.animal.findUnique({ where: { idAnimal } });
  if (!animal) {
    throw new AppError('Animal não encontrado', 404);
  }
  if (!podeMutar(animal, auth)) {
    throw new AppError('Acesso negado', 403);
  }
  return animal;
}

async function criar(body, auth) {
  rejeitarIdsLegados(body);
  rejeitarCamposImagemNoJson(body);
  const nome = requireString(body.nome, 'nome', 80);
  const descricao = requireString(body.descricao, 'descricao', 200);
  const status = validarStatus(body.status);
  const especie = validarEspecie(body.especie);
  const idade = validarIdade(body.idade);
  const porte = validarPorte(body.porte);
  const cidade = await findOrCreateCidade(body.cidade);
  const raca = await findOrCreateRaca(body.raca);
  const vinculo = vinculoDoAuth(auth);

  const animal = await prisma.animal.create({
    data: {
      nome,
      descricao,
      status,
      especie,
      idade,
      porte,
      idCidade: cidade.idCidade,
      idRaca: raca.idRaca,
      ...vinculo,
    },
    include: animalInclude,
  });

  return semEmbedding(animal);
}

async function listar({ status } = {}) {
  const where = {};
  if (status !== undefined && status !== null && status !== '') {
    where.status = validarStatus(status);
  }

  const animais = await prisma.animal.findMany({
    where,
    include: animalInclude,
    orderBy: { idAnimal: 'asc' },
  });
  return animais.map(semEmbedding);
}

async function buscarPorId(id) {
  const idAnimal = parseId(id);
  const animal = await prisma.animal.findUnique({
    where: { idAnimal },
    include: animalInclude,
  });
  if (!animal) {
    throw new AppError('Animal não encontrado', 404);
  }
  return semEmbedding(animal);
}

async function atualizar(id, body, auth) {
  rejeitarIdsLegados(body);
  rejeitarCamposImagemNoJson(body);
  const idAnimal = parseId(id);
  await assertPodeMutar(idAnimal, auth);

  const data = {};

  if (body.nome !== undefined) {
    data.nome = requireString(body.nome, 'nome', 80);
  }
  if (body.descricao !== undefined) {
    data.descricao = requireString(body.descricao, 'descricao', 200);
  }
  if (body.status !== undefined) {
    data.status = validarStatus(body.status);
  }
  if (body.especie !== undefined) {
    data.especie = validarEspecie(body.especie);
  }
  if (body.idade !== undefined) {
    data.idade = validarIdade(body.idade);
  }
  if (body.porte !== undefined) {
    data.porte = validarPorte(body.porte);
  }
  if (body.cidade !== undefined) {
    const cidade = await findOrCreateCidade(body.cidade);
    data.idCidade = cidade.idCidade;
  }
  if (body.raca !== undefined) {
    const raca = await findOrCreateRaca(body.raca);
    data.idRaca = raca.idRaca;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Nenhum campo para atualizar');
  }

  const atualizado = await prisma.animal.update({
    where: { idAnimal },
    data,
    include: animalInclude,
  });
  return semEmbedding(atualizado);
}

async function excluir(id, auth) {
  const idAnimal = parseId(id);
  const animal = await assertPodeMutar(idAnimal, auth);

  const transacoes = await prisma.transacao.count({ where: { idAnimal } });
  if (transacoes > 0) {
    throw new AppError('Animal possui transações vinculadas e não pode ser excluído', 409);
  }

  const urlAntiga = animal.urlImagem;
  await prisma.animal.delete({ where: { idAnimal } });
  await removerObjeto(urlAntiga);
}

async function enviarImagem(id, file, auth) {
  const idAnimal = parseId(id);
  const animal = await assertPodeMutar(idAnimal, auth);

  if (!file || !file.buffer || file.size === 0) {
    throw new AppError('imagem é obrigatório');
  }

  const urlImagem = await uploadImagemAnimal(idAnimal, file);
  const embedding = await tentarEmbedding(file);
  const atualizado = await prisma.animal.update({
    where: { idAnimal },
    data: { urlImagem, embedding },
    include: animalInclude,
  });
  await removerObjeto(animal.urlImagem);
  return semEmbedding(atualizado);
}

async function removerImagem(id, auth) {
  const idAnimal = parseId(id);
  const animal = await assertPodeMutar(idAnimal, auth);

  if (animal.urlImagem) {
    await prisma.animal.update({
      where: { idAnimal },
      data: { urlImagem: null, embedding: null },
    });
    await removerObjeto(animal.urlImagem);
  }
}

async function comparar(file, query = {}) {
  if (!file || !file.buffer || file.size === 0) {
    throw new AppError('imagem é obrigatório');
  }

  const limite = parseLimite(query.limite);
  const minScore = parseMinScore(query.minScore);
  const statusAlvo = parseStatusAlvo(query.statusAlvo);
  const queryEmbedding = await gerarEmbedding(file);

  const animais = await prisma.animal.findMany({
    where: {
      status: { in: statusAlvo },
      NOT: { urlImagem: null },
    },
    include: animalInclude,
  });

  const ranked = animais
    .filter((animal) => Array.isArray(animal.embedding) && animal.embedding.length)
    .map((animal) => ({
      animal,
      score: cosineSimilarity(queryEmbedding, animal.embedding),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);

  const keyImageSent = `busca/${crypto.randomUUID()}`;
  const dataBusca = new Date();
  const candidatos = [];

  for (const item of ranked) {
    const scoreSimilarity = arredondarScore(item.score);
    await prisma.transacao.create({
      data: {
        keyImageSent,
        keyImageCompared: `animal/${item.animal.idAnimal}`,
        dataBusca,
        scoreSimilarity,
        idAnimal: item.animal.idAnimal,
      },
    });
    candidatos.push({
      scoreSimilarity,
      animal: semEmbedding(item.animal),
    });
  }

  return { candidatos };
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  excluir,
  enviarImagem,
  removerImagem,
  comparar,
};
