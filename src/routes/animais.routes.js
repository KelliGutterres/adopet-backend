const { Router } = require('express');
const animaisController = require('../controllers/animais.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { uploadImagem } = require('../middleware/uploadImagem');

const router = Router();

router.get('/', animaisController.listar);
router.get('/:id', animaisController.buscarPorId);

router.post(
  '/',
  authenticate,
  authorize('ong', 'usuario'),
  animaisController.criar
);

router.post(
  '/:id/imagem',
  authenticate,
  authorize('ong', 'usuario'),
  uploadImagem,
  animaisController.enviarImagem
);

router.delete(
  '/:id/imagem',
  authenticate,
  authorize('ong', 'usuario'),
  animaisController.removerImagem
);

router.put(
  '/:id',
  authenticate,
  authorize('ong', 'usuario'),
  animaisController.atualizar
);

router.patch(
  '/:id',
  authenticate,
  authorize('ong', 'usuario'),
  animaisController.atualizar
);

router.delete(
  '/:id',
  authenticate,
  authorize('ong', 'usuario'),
  animaisController.excluir
);

module.exports = router;
