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
};
