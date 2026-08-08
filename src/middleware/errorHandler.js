function errorHandler(err, _req, res, _next) {
  console.error(err);

  const status = err.statusCode || 500;
  const message =
    status === 500 ? 'Erro interno do servidor' : err.message || 'Erro na requisição';

  res.status(status).json({
    error: {
      message,
    },
  });
}

module.exports = { errorHandler };
