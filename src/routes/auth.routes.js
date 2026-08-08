const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');

const router = Router();

router.post('/usuarios/cadastro', authController.cadastrarUsuario);
router.post('/usuarios/login', authController.loginUsuario);
router.post('/ongs/cadastro', authController.cadastrarOng);
router.post('/ongs/login', authController.loginOng);
router.get('/me', authenticate, authController.me);

module.exports = router;
