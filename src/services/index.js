const authService = require('./auth.service');
const animaisService = require('./animais.service');
const usuariosService = require('./usuarios.service');
const ongsService = require('./ongs.service');
const notificacoesService = require('./notificacoes.service');

module.exports = {
  authService,
  animaisService,
  usuariosService,
  ongsService,
  notificacoesService,
  localidadeService: require('./localidade.service'),
  storageService: require('./storage.service'),
  aiService: require('./ai.service'),
};
