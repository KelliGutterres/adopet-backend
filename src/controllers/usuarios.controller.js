const usuariosService = require('../services/usuarios.service');

async function buscarMe(req, res, next) {
  try {
    const usuario = await usuariosService.buscarMe(req.auth);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
}

async function atualizarMe(req, res, next) {
  try {
    const usuario = await usuariosService.atualizarMe(req.body, req.auth);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const usuarios = await usuariosService.listar();
    res.status(200).json({ usuarios });
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const usuario = await usuariosService.buscarPorId(req.params.id);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    await usuariosService.excluir(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buscarMe,
  atualizarMe,
  listar,
  buscarPorId,
  excluir,
};
