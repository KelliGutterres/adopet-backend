const authService = require('../services/auth.service');

async function cadastrarUsuario(req, res, next) {
  try {
    const result = await authService.cadastrarUsuario(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function loginUsuario(req, res, next) {
  try {
    const result = await authService.loginUsuario(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function cadastrarOng(req, res, next) {
  try {
    const result = await authService.cadastrarOng(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function loginOng(req, res, next) {
  try {
    const result = await authService.loginOng(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.status(200).json({
    id: req.auth.id,
    papel: req.auth.papel,
    email: req.auth.email,
  });
}

module.exports = {
  cadastrarUsuario,
  loginUsuario,
  cadastrarOng,
  loginOng,
  me,
};
