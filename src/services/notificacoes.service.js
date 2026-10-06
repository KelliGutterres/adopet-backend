const { prisma } = require('../db');
const { AppError } = require('../errors/AppError');

const LIMITE_LISTA = 50;
const TIPO_CADASTRO = 'ANIMAL_CADASTRADO';

const TITULO_POR_STATUS = {
  A: 'Novo animal para adoção',
  P: 'Novo animal perdido',
  E: 'Novo animal encontrado',
};

const ESPECIE_LABEL = {
  CAO: 'Cão',
  GATO: 'Gato',
};

function parseId(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('id inválido');
  }
  return n;
}

function leituraDaConta(auth) {
  return { papel: auth.papel, idConta: auth.id };
}

function filtroVisivel(auth) {
  if (auth.papel === 'ong') {
    return {
      OR: [{ idInstituicaoAutor: null }, { idInstituicaoAutor: { not: auth.id } }],
    };
  }
  if (auth.papel === 'usuario') {
    return {
      OR: [{ idUsuarioAutor: null }, { idUsuarioAutor: { not: auth.id } }],
    };
  }
  throw new AppError('Acesso negado', 403);
}

function mensagemCadastro(animal) {
  const autor = (animal.instituicao?.nome || animal.usuario?.nome || 'Alguém').trim();
  const especie = ESPECIE_LABEL[animal.especie] || 'animal';
  const texto = `${autor} cadastrou ${animal.nome} (${especie}).`;
  if (texto.length <= 200) {
    return texto;
  }
  return `${texto.slice(0, 197)}...`;
}

async function registrarCadastroAnimal(tx, animal) {
  const titulo = TITULO_POR_STATUS[String(animal.status || '').trim()];
  if (!titulo) {
    return;
  }

  await tx.notificacao.create({
    data: {
      tipo: TIPO_CADASTRO,
      titulo,
      mensagem: mensagemCadastro(animal),
      idAnimal: animal.idAnimal,
      idUsuarioAutor: animal.idUsuario ?? null,
      idInstituicaoAutor: animal.idInstituicao ?? null,
    },
  });
}

function paraCliente(row) {
  return {
    idNotificacao: row.idNotificacao,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    lida: row.leituras.length > 0,
    criadoEm: row.criadoEm.toISOString(),
    animal: row.animal
      ? {
          idAnimal: row.animal.idAnimal,
          nome: row.animal.nome,
          status: String(row.animal.status || '').trim(),
          urlImagem: row.animal.urlImagem,
        }
      : null,
  };
}

async function listar(auth) {
  const where = filtroVisivel(auth);
  const leitura = leituraDaConta(auth);

  const [rows, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: LIMITE_LISTA,
      include: {
        animal: {
          select: {
            idAnimal: true,
            nome: true,
            status: true,
            urlImagem: true,
          },
        },
        leituras: {
          where: leitura,
          select: { idNotificacao: true },
        },
      },
    }),
    prisma.notificacao.count({
      where: {
        AND: [where, { leituras: { none: leitura } }],
      },
    }),
  ]);

  return {
    naoLidas,
    notificacoes: rows.map(paraCliente),
  };
}

async function marcarLida(id, auth) {
  const idNotificacao = parseId(id);
  const existente = await prisma.notificacao.findFirst({
    where: { idNotificacao, ...filtroVisivel(auth) },
    select: { idNotificacao: true },
  });
  if (!existente) {
    throw new AppError('Notificação não encontrada', 404);
  }

  const leitura = leituraDaConta(auth);
  await prisma.notificacaoLeitura.upsert({
    where: {
      idNotificacao_papel_idConta: {
        idNotificacao,
        ...leitura,
      },
    },
    create: { idNotificacao, ...leitura },
    update: {},
  });
}

async function marcarTodasLidas(auth) {
  const leitura = leituraDaConta(auth);
  const pendentes = await prisma.notificacao.findMany({
    where: {
      AND: [filtroVisivel(auth), { leituras: { none: leitura } }],
    },
    select: { idNotificacao: true },
  });
  if (pendentes.length === 0) {
    return;
  }

  await prisma.notificacaoLeitura.createMany({
    data: pendentes.map((item) => ({
      idNotificacao: item.idNotificacao,
      ...leitura,
    })),
    skipDuplicates: true,
  });
}

module.exports = {
  registrarCadastroAnimal,
  listar,
  marcarLida,
  marcarTodasLidas,
};
