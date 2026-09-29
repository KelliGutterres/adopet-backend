const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = Router();

router.get('/', authenticate, authorize('ong'), dashboardController.metricas);

module.exports = router;
