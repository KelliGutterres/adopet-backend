-- AlterTable
ALTER TABLE "Animal" ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ExclusaoAnimal" (
    "idExclusao" SERIAL NOT NULL,
    "status" CHAR(1) NOT NULL,
    "excluidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExclusaoAnimal_pkey" PRIMARY KEY ("idExclusao")
);

-- CreateIndex
CREATE INDEX "ExclusaoAnimal_status_excluidoEm_idx" ON "ExclusaoAnimal"("status", "excluidoEm");

-- CreateIndex
CREATE INDEX "Animal_status_criadoEm_idx" ON "Animal"("status", "criadoEm");
