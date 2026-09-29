const dashboardService = require('../services/dashboard.service');

async function metricas(req, res, next) {
  try {
    const metricas = await dashboardService.metricas(req.query.periodo);
    res.status(200).json({ metricas });
  } catch (err) {
    next(err);
  }
}

module.exports = { metricas };
