const { AppError } = require('../errors/AppError');

function authorize(...papeis) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError('Não autenticado', 401));
      return;
    }

    if (!papeis.includes(req.auth.papel)) {
      next(new AppError('Acesso negado', 403));
      return;
    }

    next();
  };
}

module.exports = { authorize };
