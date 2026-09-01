const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const animaisRoutes = require('./animais.routes');
const usuariosRoutes = require('./usuarios.routes');
const ongsRoutes = require('./ongs.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/animais', animaisRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/ongs', ongsRoutes);

module.exports = router;
