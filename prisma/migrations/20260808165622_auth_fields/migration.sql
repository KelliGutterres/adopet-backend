-- AlterTable
ALTER TABLE "Instituicao" ADD COLUMN     "email" VARCHAR(150) NOT NULL,
ADD COLUMN     "senha" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "email" VARCHAR(150) NOT NULL,
ADD COLUMN     "senha" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Instituicao_email_key" ON "Instituicao"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
