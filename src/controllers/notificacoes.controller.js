const notificacoesService = require('../services/notificacoes.service');

async function listar(req, res, next) {
  try {
    const resultado = await notificacoesService.listar(req.auth);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function marcarLida(req, res, next) {
  try {
    await notificacoesService.marcarLida(req.params.id, req.auth);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function marcarTodasLidas(req, res, next) {
  try {
    await notificacoesService.marcarTodasLidas(req.auth);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  marcarLida,
  marcarTodasLidas,
};
