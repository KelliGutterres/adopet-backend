const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;
const SENHA_PLAIN = 'senha123';

const SEED = {
  cidade: {
    nome: 'Lajeado',
    endereco: 'Centro',
    uf: 'RS',
    pais: 'Brasil',
  },
  raca: {
    nome: 'Vira-lata',
    descricao: 'Sem raça definida',
  },
  usuario: {
    nome: 'Usuario Demo',
    email: 'usuario@adopet.local',
    contato: '51999999999',
    status: 'A',
  },
  ong: {
    nome: 'ONG AdoPet Demo',
    email: 'ong@adopet.local',
  },
  animaisOng: [
    {
      nome: 'Thor',
      status: 'A',
      descricao: 'Cachorro dócil disponível para adoção',
      especie: 'CAO',
      idade: 3,
      porte: 'M',
    },
    {
      nome: 'Luna',
      status: 'P',
      descricao: 'Gata perdida — última vista no centro',
      especie: 'GATO',
      idade: 2,
      porte: 'P',
    },
  ],
  animalUsuario: {
    nome: 'Mel',
    status: 'E',
    descricao: 'Cachorra encontrada perto da praça',
    especie: 'CAO',
    idade: 1,
    porte: 'P',
  },
};

async function ensureCidade() {
  const existing = await prisma.cidade.findFirst({
    where: {
      nome: SEED.cidade.nome,
      uf: SEED.cidade.uf,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.cidade.create({ data: SEED.cidade });
}

async function ensureRaca() {
  const existing = await prisma.raca.findFirst({
    where: { nome: SEED.raca.nome },
  });

  if (existing) {
    return existing;
  }

  return prisma.raca.create({ data: SEED.raca });
}

async function ensureUsuario(idCidade, senhaHash) {
  const existing = await prisma.usuario.findUnique({
    where: { email: SEED.usuario.email },
  });

  if (existing) {
    return prisma.usuario.update({
      where: { email: SEED.usuario.email },
      data: {
        nome: SEED.usuario.nome,
        contato: SEED.usuario.contato,
        status: SEED.usuario.status,
        senha: senhaHash,
        idCidade,
      },
    });
  }

  return prisma.usuario.create({
    data: {
      ...SEED.usuario,
      senha: senhaHash,
      idCidade,
    },
  });
}

async function ensureOng(idCidade, senhaHash) {
  const existing = await prisma.instituicao.findUnique({
    where: { email: SEED.ong.email },
  });

  if (existing) {
    return prisma.instituicao.update({
      where: { email: SEED.ong.email },
      data: {
        nome: SEED.ong.nome,
        senha: senhaHash,
        idCidade,
      },
    });
  }

  return prisma.instituicao.create({
    data: {
      ...SEED.ong,
      senha: senhaHash,
      idCidade,
    },
  });
}

async function ensureAnimalOng(animal, { idCidade, idInstituicao, idRaca }) {
  const existing = await prisma.animal.findFirst({
    where: {
      nome: animal.nome,
      idInstituicao,
    },
  });

  const data = {
    status: animal.status,
    descricao: animal.descricao,
    especie: animal.especie,
    idade: animal.idade,
    porte: animal.porte,
    idCidade,
    idRaca,
    idInstituicao,
    idUsuario: null,
  };

  if (existing) {
    return prisma.animal.update({
      where: { idAnimal: existing.idAnimal },
      data,
    });
  }

  return prisma.animal.create({
    data: {
      nome: animal.nome,
      ...data,
    },
  });
}

async function ensureAnimalUsuario(animal, { idCidade, idUsuario, idRaca }) {
  const existing = await prisma.animal.findFirst({
    where: {
      nome: animal.nome,
      idUsuario,
    },
  });

  const data = {
    status: animal.status,
    descricao: animal.descricao,
    especie: animal.especie,
    idade: animal.idade,
    porte: animal.porte,
    idCidade,
    idRaca,
    idUsuario,
    idInstituicao: null,
  };

  if (existing) {
    return prisma.animal.update({
      where: { idAnimal: existing.idAnimal },
      data,
    });
  }

  return prisma.animal.create({
    data: {
      nome: animal.nome,
      ...data,
    },
  });
}

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_PLAIN, BCRYPT_ROUNDS);

  const cidade = await ensureCidade();
  const raca = await ensureRaca();
  const usuario = await ensureUsuario(cidade.idCidade, senhaHash);
  const ong = await ensureOng(cidade.idCidade, senhaHash);

  const animais = [];
  for (const animal of SEED.animaisOng) {
    animais.push(
      await ensureAnimalOng(animal, {
        idCidade: cidade.idCidade,
        idInstituicao: ong.idInstituicao,
        idRaca: raca.idRaca,
      })
    );
  }

  animais.push(
    await ensureAnimalUsuario(SEED.animalUsuario, {
      idCidade: cidade.idCidade,
      idUsuario: usuario.idUsuario,
      idRaca: raca.idRaca,
    })
  );

  console.log('Seed ok');
  console.log(`  Cidade: ${cidade.nome}/${cidade.uf} (id=${cidade.idCidade})`);
  console.log(`  Raca: ${raca.nome} (id=${raca.idRaca})`);
  console.log(`  Usuario: ${usuario.email} (id=${usuario.idUsuario})`);
  console.log(`  ONG: ${ong.email} (id=${ong.idInstituicao})`);
  console.log(
    `  Animais: ${animais.map((a) => `${a.nome}[${a.status}]`).join(', ')}`
  );
  console.log('Credenciais (dev): usuario@adopet.local / ong@adopet.local — senha123');
}

main()
  .catch((err) => {
    console.error('Seed falhou:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
