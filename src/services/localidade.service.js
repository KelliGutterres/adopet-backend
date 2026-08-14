const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');

const PAIS_DEFAULT = 'Brasil';
const ENDERECO_PLACEHOLDER = '-';

const cidadePublicaSelect = {
  idCidade: true,
  nome: true,
  uf: true,
};

function cidadePublica(cidade) {
  if (!cidade) {
    return null;
  }
  return {
    idCidade: cidade.idCidade,
    nome: cidade.nome,
    uf: cidade.uf,
  };
}

function rejeitarIdsLegados(body = {}) {
  if (body.idCidade !== undefined) {
    throw new AppError('idCidade não é aceito; envie cidade: { nome, uf }');
  }
  if (body.idRaca !== undefined) {
    throw new AppError('idRaca não é aceito; envie raca: { nome }');
  }
}

function normalizarNome(value, campo, maxLen) {
  if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${campo} é obrigatório`);
  }
  const nome = value.trim();
  if (nome.length > maxLen) {
    throw new AppError(`${campo} deve ter no máximo ${maxLen} caracteres`);
  }
  return nome;
}

function normalizarUf(value) {
  if (value === undefined || value === null || typeof value !== 'string' || !value.trim()) {
    throw new AppError('uf é obrigatório');
  }
  const uf = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new AppError('uf inválido (use 2 letras, ex.: RS)');
  }
  return uf;
}

function parseCidadeInput(input, { required = true } = {}) {
  if (input === undefined || input === null) {
    if (required) {
      throw new AppError('cidade é obrigatória');
    }
    return null;
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('cidade deve ser um objeto { nome, uf }');
  }
  return {
    nome: normalizarNome(input.nome, 'cidade.nome', 60),
    uf: normalizarUf(input.uf),
  };
}

function parseRacaInput(input, { required = true } = {}) {
  if (input === undefined || input === null) {
    if (required) {
      throw new AppError('raca é obrigatória');
    }
    return null;
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('raca deve ser um objeto { nome }');
  }
  return {
    nome: normalizarNome(input.nome, 'raca.nome', 60),
  };
}

function isUniqueViolation(err) {
  return err && err.code === 'P2002';
}

async function findOrCreateCidade(input) {
  const { nome, uf } = parseCidadeInput(input, { required: true });

  const existente = await prisma.cidade.findFirst({
    where: {
      nome: { equals: nome, mode: 'insensitive' },
      uf,
    },
  });
  if (existente) {
    return existente;
  }

  try {
    return await prisma.cidade.create({
      data: {
        nome,
        uf,
        pais: PAIS_DEFAULT,
        endereco: ENDERECO_PLACEHOLDER,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const deNovo = await prisma.cidade.findFirst({
        where: {
          nome: { equals: nome, mode: 'insensitive' },
          uf,
        },
      });
      if (deNovo) {
        return deNovo;
      }
    }
    throw err;
  }
}

async function findOrCreateRaca(input) {
  const { nome } = parseRacaInput(input, { required: true });

  const existente = await prisma.raca.findFirst({
    where: {
      nome: { equals: nome, mode: 'insensitive' },
    },
  });
  if (existente) {
    return existente;
  }

  try {
    return await prisma.raca.create({
      data: {
        nome,
        descricao: nome,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const deNovo = await prisma.raca.findFirst({
        where: {
          nome: { equals: nome, mode: 'insensitive' },
        },
      });
      if (deNovo) {
        return deNovo;
      }
    }
    throw err;
  }
}

module.exports = {
  cidadePublica,
  cidadePublicaSelect,
  rejeitarIdsLegados,
  parseCidadeInput,
  parseRacaInput,
  findOrCreateCidade,
  findOrCreateRaca,
};
