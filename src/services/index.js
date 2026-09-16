const authService = require('./auth.service');
const animaisService = require('./animais.service');
const usuariosService = require('./usuarios.service');
const ongsService = require('./ongs.service');

module.exports = {
  authService,
  animaisService,
  usuariosService,
  ongsService,
  localidadeService: require('./localidade.service'),
  storageService: require('./storage.service'),
  aiService: require('./ai.service'),
};
