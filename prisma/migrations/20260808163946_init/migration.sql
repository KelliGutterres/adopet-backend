-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Cidade" (
    "idCidade" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "endereco" VARCHAR(200) NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "pais" VARCHAR(45) NOT NULL,

    CONSTRAINT "Cidade_pkey" PRIMARY KEY ("idCidade")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "idUsuario" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "contato" VARCHAR(20) NOT NULL,
    "status" CHAR(1) NOT NULL,
    "idCidade" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateTable
CREATE TABLE "Instituicao" (
    "idInstituicao" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "idCidade" INTEGER NOT NULL,

    CONSTRAINT "Instituicao_pkey" PRIMARY KEY ("idInstituicao")
);

-- CreateTable
CREATE TABLE "Raca" (
    "idRaca" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,

    CONSTRAINT "Raca_pkey" PRIMARY KEY ("idRaca")
);

-- CreateTable
CREATE TABLE "Animal" (
    "idAnimal" SERIAL NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "status" CHAR(1) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "idCidade" INTEGER NOT NULL,
    "idInstituicao" INTEGER,
    "idRaca" INTEGER NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("idAnimal")
);

-- CreateTable
CREATE TABLE "Transacao" (
    "idTransacao" SERIAL NOT NULL,
    "keyImageSent" VARCHAR(200) NOT NULL,
    "keyImageCompared" VARCHAR(200) NOT NULL,
    "dataBusca" TIMESTAMP(3) NOT NULL,
    "scoreSimilarity" DECIMAL(5,4) NOT NULL,
    "idAnimal" INTEGER NOT NULL,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("idTransacao")
);

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_idCidade_fkey" FOREIGN KEY ("idCidade") REFERENCES "Cidade"("idCidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instituicao" ADD CONSTRAINT "Instituicao_idCidade_fkey" FOREIGN KEY ("idCidade") REFERENCES "Cidade"("idCidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_idCidade_fkey" FOREIGN KEY ("idCidade") REFERENCES "Cidade"("idCidade") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_idInstituicao_fkey" FOREIGN KEY ("idInstituicao") REFERENCES "Instituicao"("idInstituicao") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_idRaca_fkey" FOREIGN KEY ("idRaca") REFERENCES "Raca"("idRaca") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_idAnimal_fkey" FOREIGN KEY ("idAnimal") REFERENCES "Animal"("idAnimal") ON DELETE RESTRICT ON UPDATE CASCADE;

