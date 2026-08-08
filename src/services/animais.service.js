const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');

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
    },
  },
  usuario: {
    select: {
      idUsuario: true,
      nome: true,
    },
  },
};

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

async function garantirCidade(idCidade) {
  const id = Number(idCidade);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('idCidade inválido');
  }
  const cidade = await prisma.cidade.findUnique({ where: { idCidade: id } });
  if (!cidade) {
    throw new AppError('Cidade não encontrada', 400);
  }
  return id;
}

async function garantirRaca(idRaca) {
  const id = Number(idRaca);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('idRaca inválido');
  }
  const raca = await prisma.raca.findUnique({ where: { idRaca: id } });
  if (!raca) {
    throw new AppError('Raça não encontrada', 400);
  }
  return id;
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

function isDono(animal, auth) {
  if (auth.papel === 'ong') {
    return animal.idInstituicao === auth.id;
  }
  if (auth.papel === 'usuario') {
    return animal.idUsuario === auth.id;
  }
  return false;
}

async function assertDono(idAnimal, auth) {
  const animal = await prisma.animal.findUnique({ where: { idAnimal } });
  if (!animal) {
    throw new AppError('Animal não encontrado', 404);
  }
  if (!isDono(animal, auth)) {
    throw new AppError('Acesso negado', 403);
  }
  return animal;
}

async function criar(body, auth) {
  const nome = requireString(body.nome, 'nome', 80);
  const descricao = requireString(body.descricao, 'descricao', 200);
  const status = validarStatus(body.status);
  const especie = validarEspecie(body.especie);
  const idade = validarIdade(body.idade);
  const porte = validarPorte(body.porte);
  const idCidade = await garantirCidade(body.idCidade);
  const idRaca = await garantirRaca(body.idRaca);
  const vinculo = vinculoDoAuth(auth);

  const animal = await prisma.animal.create({
    data: {
      nome,
      descricao,
      status,
      especie,
      idade,
      porte,
      idCidade,
      idRaca,
      ...vinculo,
    },
    include: animalInclude,
  });

  return animal;
}

async function listar({ status } = {}) {
  const where = {};
  if (status !== undefined && status !== null && status !== '') {
    where.status = validarStatus(status);
  }

  return prisma.animal.findMany({
    where,
    include: animalInclude,
    orderBy: { idAnimal: 'asc' },
  });
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
  return animal;
}

async function atualizar(id, body, auth) {
  const idAnimal = parseId(id);
  await assertDono(idAnimal, auth);

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
  if (body.idCidade !== undefined) {
    data.idCidade = await garantirCidade(body.idCidade);
  }
  if (body.idRaca !== undefined) {
    data.idRaca = await garantirRaca(body.idRaca);
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Nenhum campo para atualizar');
  }

  return prisma.animal.update({
    where: { idAnimal },
    data,
    include: animalInclude,
  });
}

async function excluir(id, auth) {
  const idAnimal = parseId(id);
  await assertDono(idAnimal, auth);

  const transacoes = await prisma.transacao.count({ where: { idAnimal } });
  if (transacoes > 0) {
    throw new AppError('Animal possui transações vinculadas e não pode ser excluído', 409);
  }

  await prisma.animal.delete({ where: { idAnimal } });
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  excluir,
};
