const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');
const { findOrCreateCidade, rejeitarIdsLegados } = require('./localidade.service');
const {
  cidadeInclude,
  usuarioPublico,
  ongPublica,
  validarEmail,
} = require('./contas.mappers');

const BCRYPT_ROUNDS = 10;
const MIN_SENHA = 6;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new AppError(`Variável de ambiente ${name} não configurada`, 500);
  }
  return value;
}

function hashSenha(senha) {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

function compararSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

function signToken({ id, papel, email }) {
  const secret = requireEnv('JWT_SECRET');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ sub: id, papel, email }, secret, { expiresIn });
}

function verifyToken(token) {
  const secret = requireEnv('JWT_SECRET');
  return jwt.verify(token, secret);
}

function validarEmailSenha(email, senha) {
  validarEmail(email);
  if (!senha || typeof senha !== 'string' || senha.length < MIN_SENHA) {
    throw new AppError(`Senha deve ter no mínimo ${MIN_SENHA} caracteres`);
  }
}

async function cadastrarUsuario(body) {
  rejeitarIdsLegados(body);
  const { nome, email, senha, contato, cidade } = body;

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    throw new AppError('Nome é obrigatório');
  }
  if (!contato || typeof contato !== 'string' || !contato.trim()) {
    throw new AppError('Contato é obrigatório');
  }

  validarEmailSenha(email, senha);
  const cidadeRow = await findOrCreateCidade(cidade);
  const emailNorm = email.trim().toLowerCase();

  const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (existente) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senhaHash = await hashSenha(senha);
  const usuario = await prisma.usuario.create({
    data: {
      nome: nome.trim(),
      email: emailNorm,
      senha: senhaHash,
      contato: contato.trim(),
      status: 'A',
      idCidade: cidadeRow.idCidade,
    },
    include: cidadeInclude,
  });

  const token = signToken({
    id: usuario.idUsuario,
    papel: 'usuario',
    email: usuario.email,
  });

  return { usuario: usuarioPublico(usuario), token };
}

async function loginUsuario({ email, senha }) {
  if (!email || !senha) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const emailNorm = String(email).trim().toLowerCase();
  const usuario = await prisma.usuario.findUnique({
    where: { email: emailNorm },
    include: cidadeInclude,
  });
  if (!usuario) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const ok = await compararSenha(senha, usuario.senha);
  if (!ok) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const token = signToken({
    id: usuario.idUsuario,
    papel: 'usuario',
    email: usuario.email,
  });

  return { usuario: usuarioPublico(usuario), token };
}

async function cadastrarOng(body) {
  rejeitarIdsLegados(body);
  const { nome, email, senha, contato, cidade } = body;

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    throw new AppError('Nome é obrigatório');
  }
  if (!contato || typeof contato !== 'string' || !contato.trim()) {
    throw new AppError('Contato é obrigatório');
  }
  const contatoTrim = contato.trim();
  if (contatoTrim.length > 20) {
    throw new AppError('contato deve ter no máximo 20 caracteres');
  }

  validarEmailSenha(email, senha);
  const cidadeRow = await findOrCreateCidade(cidade);
  const emailNorm = email.trim().toLowerCase();

  const existente = await prisma.instituicao.findUnique({ where: { email: emailNorm } });
  if (existente) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senhaHash = await hashSenha(senha);
  const instituicao = await prisma.instituicao.create({
    data: {
      nome: nome.trim(),
      email: emailNorm,
      senha: senhaHash,
      contato: contatoTrim,
      idCidade: cidadeRow.idCidade,
    },
    include: cidadeInclude,
  });

  const token = signToken({
    id: instituicao.idInstituicao,
    papel: 'ong',
    email: instituicao.email,
  });

  return { ong: ongPublica(instituicao), token };
}

async function loginOng({ email, senha }) {
  if (!email || !senha) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const emailNorm = String(email).trim().toLowerCase();
  const instituicao = await prisma.instituicao.findUnique({
    where: { email: emailNorm },
    include: cidadeInclude,
  });
  if (!instituicao) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const ok = await compararSenha(senha, instituicao.senha);
  if (!ok) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const token = signToken({
    id: instituicao.idInstituicao,
    papel: 'ong',
    email: instituicao.email,
  });

  return { ong: ongPublica(instituicao), token };
}

async function redefinirSenhaUsuario({ email, senha }) {
  validarEmailSenha(email, senha);
  const emailNorm = email.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (!usuario) {
    throw new AppError('E-mail não encontrado', 404);
  }

  const senhaHash = await hashSenha(senha);
  await prisma.usuario.update({
    where: { idUsuario: usuario.idUsuario },
    data: { senha: senhaHash },
  });
}

async function redefinirSenhaOng({ email, senha }) {
  validarEmailSenha(email, senha);
  const emailNorm = email.trim().toLowerCase();

  const instituicao = await prisma.instituicao.findUnique({ where: { email: emailNorm } });
  if (!instituicao) {
    throw new AppError('E-mail não encontrado', 404);
  }

  const senhaHash = await hashSenha(senha);
  await prisma.instituicao.update({
    where: { idInstituicao: instituicao.idInstituicao },
    data: { senha: senhaHash },
  });
}

module.exports = {
  cadastrarUsuario,
  loginUsuario,
  cadastrarOng,
  loginOng,
  redefinirSenhaUsuario,
  redefinirSenhaOng,
  verifyToken,
  signToken,
};
