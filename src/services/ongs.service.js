const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');
const { findOrCreateCidade, rejeitarIdsLegados } = require('./localidade.service');
const {
  cidadeInclude,
  ongPublica,
  validarEmail,
  optionalTrimmedString,
  rejeitarCamposProibidos,
} = require('./contas.mappers');

async function carregarOng(idInstituicao) {
  const instituicao = await prisma.instituicao.findUnique({
    where: { idInstituicao },
    include: cidadeInclude,
  });
  if (!instituicao) {
    throw new AppError('ONG não encontrada', 404);
  }
  return instituicao;
}

async function buscarMe(auth) {
  const instituicao = await carregarOng(auth.id);
  return ongPublica(instituicao);
}

async function atualizarMe(body = {}, auth) {
  rejeitarIdsLegados(body);
  rejeitarCamposProibidos(body, ['contato']);
  await carregarOng(auth.id);

  const data = {};
  const nome = optionalTrimmedString(body.nome, 'nome', 100);
  if (nome !== undefined) {
    data.nome = nome;
  }

  if (body.email !== undefined) {
    const emailNorm = validarEmail(body.email);
    const existente = await prisma.instituicao.findUnique({ where: { email: emailNorm } });
    if (existente && existente.idInstituicao !== auth.id) {
      throw new AppError('E-mail já cadastrado', 409);
    }
    data.email = emailNorm;
  }

  if (body.cidade !== undefined) {
    const cidade = await findOrCreateCidade(body.cidade);
    data.idCidade = cidade.idCidade;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Nenhum campo para atualizar');
  }

  const instituicao = await prisma.instituicao.update({
    where: { idInstituicao: auth.id },
    data,
    include: cidadeInclude,
  });

  return ongPublica(instituicao);
}

module.exports = {
  buscarMe,
  atualizarMe,
};
