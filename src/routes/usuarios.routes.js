const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = Router();

router.get('/me', authenticate, authorize('usuario'), usuariosController.buscarMe);
router.put('/me', authenticate, authorize('usuario'), usuariosController.atualizarMe);
router.patch('/me', authenticate, authorize('usuario'), usuariosController.atualizarMe);

router.get('/', authenticate, authorize('ong'), usuariosController.listar);
router.get('/:id', authenticate, authorize('ong'), usuariosController.buscarPorId);
router.delete('/:id', authenticate, authorize('ong'), usuariosController.excluir);

module.exports = router;
