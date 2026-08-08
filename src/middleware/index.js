const { errorHandler } = require('./errorHandler');
const { authenticate } = require('./authenticate');
const { authorize } = require('./authorize');

module.exports = {
  errorHandler,
  authenticate,
  authorize,
};
