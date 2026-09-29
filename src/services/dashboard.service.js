const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');

const PERIODOS_DIAS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function resolverPeriodo(periodo) {
  if (periodo === undefined || periodo === null || periodo === '') {
    return '7d';
  }
  if (typeof periodo !== 'string' || PERIODOS_DIAS[periodo] === undefined) {
    throw new AppError('periodo inválido (use 7d, 30d ou 90d)');
  }
  return periodo;
}

function inicioDoPeriodo(periodo) {
  const dias = PERIODOS_DIAS[periodo];
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

async function metricas(periodo) {
  const chave = resolverPeriodo(periodo);
  const desde = inicioDoPeriodo(chave);

  const [adocao, encontrados, perdidos, adotados] = await Promise.all([
    prisma.animal.count({ where: { status: 'A', criadoEm: { gte: desde } } }),
    prisma.animal.count({ where: { status: 'E', criadoEm: { gte: desde } } }),
    prisma.animal.count({ where: { status: 'P', criadoEm: { gte: desde } } }),
    prisma.exclusaoAnimal.count({ where: { status: 'A', excluidoEm: { gte: desde } } }),
  ]);

  return {
    periodo: chave,
    adocao,
    encontrados,
    perdidos,
    adotados,
  };
}

module.exports = { metricas };
