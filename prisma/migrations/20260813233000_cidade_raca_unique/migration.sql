-- CreateIndex
CREATE UNIQUE INDEX "Cidade_nome_uf_key" ON "Cidade"("nome", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "Raca_nome_key" ON "Raca"("nome");
