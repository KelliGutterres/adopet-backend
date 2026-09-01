const ongsService = require('../services/ongs.service');

async function buscarMe(req, res, next) {
  try {
    const ong = await ongsService.buscarMe(req.auth);
    res.status(200).json({ ong });
  } catch (err) {
    next(err);
  }
}

async function atualizarMe(req, res, next) {
  try {
    const ong = await ongsService.atualizarMe(req.body, req.auth);
    res.status(200).json({ ong });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buscarMe,
  atualizarMe,
};
