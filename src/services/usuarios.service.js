const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');
const { findOrCreateCidade, rejeitarIdsLegados } = require('./localidade.service');
const {
  cidadeInclude,
  usuarioPublico,
  validarEmail,
  optionalTrimmedString,
  rejeitarCamposProibidos,
} = require('./contas.mappers');

function parseId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('id inválido');
  }
  return n;
}

async function carregarUsuario(idUsuario) {
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario },
    include: cidadeInclude,
  });
  if (!usuario) {
    throw new AppError('Usuário não encontrado', 404);
  }
  return usuario;
}

async function buscarMe(auth) {
  const usuario = await carregarUsuario(auth.id);
  return usuarioPublico(usuario);
}

async function atualizarMe(body = {}, auth) {
  rejeitarIdsLegados(body);
  rejeitarCamposProibidos(body);
  await carregarUsuario(auth.id);

  const data = {};
  const nome = optionalTrimmedString(body.nome, 'nome', 150);
  if (nome !== undefined) {
    data.nome = nome;
  }

  if (body.email !== undefined) {
    const emailNorm = validarEmail(body.email);
    const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (existente && existente.idUsuario !== auth.id) {
      throw new AppError('E-mail já cadastrado', 409);
    }
    data.email = emailNorm;
  }

  const contato = optionalTrimmedString(body.contato, 'contato', 20);
  if (contato !== undefined) {
    data.contato = contato;
  }

  if (body.cidade !== undefined) {
    const cidade = await findOrCreateCidade(body.cidade);
    data.idCidade = cidade.idCidade;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Nenhum campo para atualizar');
  }

  const usuario = await prisma.usuario.update({
    where: { idUsuario: auth.id },
    data,
    include: cidadeInclude,
  });

  return usuarioPublico(usuario);
}

async function listar() {
  const usuarios = await prisma.usuario.findMany({
    include: cidadeInclude,
    orderBy: { idUsuario: 'asc' },
  });
  return usuarios.map(usuarioPublico);
}

async function buscarPorId(id) {
  const usuario = await carregarUsuario(parseId(id));
  return usuarioPublico(usuario);
}

async function excluir(id) {
  const idUsuario = parseId(id);
  await carregarUsuario(idUsuario);

  const animais = await prisma.animal.count({ where: { idUsuario } });
  if (animais > 0) {
    throw new AppError('Usuário possui animais vinculados e não pode ser excluído', 409);
  }

  await prisma.usuario.delete({ where: { idUsuario } });
}

module.exports = {
  buscarMe,
  atualizarMe,
  listar,
  buscarPorId,
  excluir,
};
