const { Router } = require('express');
const notificacoesController = require('../controllers/notificacoes.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = Router();

router.use(authenticate, authorize('ong', 'usuario'));

router.get('/', notificacoesController.listar);
router.patch('/lidas', notificacoesController.marcarTodasLidas);
router.patch('/:id/lida', notificacoesController.marcarLida);

module.exports = router;
