const { Router } = require('express');
const ongsController = require('../controllers/ongs.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = Router();

router.get('/me', authenticate, authorize('ong'), ongsController.buscarMe);
router.put('/me', authenticate, authorize('ong'), ongsController.atualizarMe);
router.patch('/me', authenticate, authorize('ong'), ongsController.atualizarMe);

module.exports = router;
