const { errorHandler } = require('./errorHandler');
const { authenticate } = require('./authenticate');
const { authorize } = require('./authorize');
const { uploadImagem } = require('./uploadImagem');

module.exports = {
  errorHandler,
  authenticate,
  authorize,
  uploadImagem,
};
