-- AlterTable
ALTER TABLE "Animal" ADD COLUMN "especie" VARCHAR(40),
ADD COLUMN "idade" INTEGER,
ADD COLUMN "porte" CHAR(1),
ADD COLUMN "idUsuario" INTEGER;

-- Backfill existing rows before NOT NULL
UPDATE "Animal" SET "especie" = 'CAO' WHERE "especie" IS NULL;

ALTER TABLE "Animal" ALTER COLUMN "especie" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;
