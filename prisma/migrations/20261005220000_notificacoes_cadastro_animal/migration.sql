-- CreateTable
CREATE TABLE "Notificacao" (
    "idNotificacao" SERIAL NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "mensagem" VARCHAR(200) NOT NULL,
    "idAnimal" INTEGER,
    "idUsuarioAutor" INTEGER,
    "idInstituicaoAutor" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("idNotificacao")
);

-- CreateTable
CREATE TABLE "NotificacaoLeitura" (
    "idNotificacao" INTEGER NOT NULL,
    "papel" VARCHAR(20) NOT NULL,
    "idConta" INTEGER NOT NULL,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoLeitura_pkey" PRIMARY KEY ("idNotificacao", "papel", "idConta")
);

-- CreateIndex
CREATE INDEX "Notificacao_criadoEm_idx" ON "Notificacao"("criadoEm");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_idAnimal_fkey" FOREIGN KEY ("idAnimal") REFERENCES "Animal"("idAnimal") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoLeitura" ADD CONSTRAINT "NotificacaoLeitura_idNotificacao_fkey" FOREIGN KEY ("idNotificacao") REFERENCES "Notificacao"("idNotificacao") ON DELETE CASCADE ON UPDATE CASCADE;
