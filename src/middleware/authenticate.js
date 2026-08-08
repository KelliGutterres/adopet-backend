const { AppError } = require('../errors/AppError');
const { verifyToken } = require('../services/auth.service');

function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Token não informado', 401);
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError('Token não informado', 401);
    }

    const payload = verifyToken(token);
    req.auth = {
      id: Number(payload.sub),
      papel: payload.papel,
      email: payload.email,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError('Token inválido ou expirado', 401));
      return;
    }
    next(err);
  }
}

module.exports = { authenticate };
