const animaisService = require('../services/animais.service');

async function criar(req, res, next) {
  try {
    const animal = await animaisService.criar(req.body, req.auth);
    res.status(201).json({ animal });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const animais = await animaisService.listar({ status: req.query.status });
    res.status(200).json({ animais });
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const animal = await animaisService.buscarPorId(req.params.id);
    res.status(200).json({ animal });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const animal = await animaisService.atualizar(req.params.id, req.body, req.auth);
    res.status(200).json({ animal });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    await animaisService.excluir(req.params.id, req.auth);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function enviarImagem(req, res, next) {
  try {
    const animal = await animaisService.enviarImagem(
      req.params.id,
      req.file,
      req.auth
    );
    res.status(200).json({ animal });
  } catch (err) {
    next(err);
  }
}

async function comparar(req, res, next) {
  try {
    const resultado = await animaisService.comparar(req.file, req.query);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function removerImagem(req, res, next) {
  try {
    await animaisService.removerImagem(req.params.id, req.auth);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
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
