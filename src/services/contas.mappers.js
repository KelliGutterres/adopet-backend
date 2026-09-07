const { AppError } = require('../errors/AppError');
const { cidadePublica, cidadePublicaSelect } = require('./localidade.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cidadeInclude = { cidade: { select: cidadePublicaSelect } };

const usuarioPublico = (usuario) => ({
  idUsuario: usuario.idUsuario,
  nome: usuario.nome,
  email: usuario.email,
  contato: usuario.contato,
  status: usuario.status,
  idCidade: usuario.idCidade,
  cidade: cidadePublica(usuario.cidade),
});

const ongPublica = (instituicao) => ({
  idInstituicao: instituicao.idInstituicao,
  nome: instituicao.nome,
  email: instituicao.email,
  contato: instituicao.contato ?? null,
  idCidade: instituicao.idCidade,
  cidade: cidadePublica(instituicao.cidade),
});

function validarEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError('E-mail inválido');
  }
  return email.trim().toLowerCase();
}

function optionalTrimmedString(value, field, maxLen) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${field} é obrigatório`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new AppError(`${field} deve ter no máximo ${maxLen} caracteres`);
  }
  return trimmed;
}

function rejeitarCamposProibidos(body = {}, extras = []) {
  if (body.senha !== undefined) {
    throw new AppError('senha não é aceita neste endpoint; use PUT /auth/usuarios/senha ou /auth/ongs/senha');
  }
  if (body.status !== undefined) {
    throw new AppError('status não pode ser alterado');
  }
  for (const campo of extras) {
    if (body[campo] !== undefined) {
      throw new AppError(`${campo} não é aceito neste endpoint`);
    }
  }
}

module.exports = {
  EMAIL_REGEX,
  cidadeInclude,
  usuarioPublico,
  ongPublica,
  validarEmail,
  optionalTrimmedString,
  rejeitarCamposProibidos,
};
