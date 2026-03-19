-- CreateTable
CREATE TABLE "LibranzaData" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ciudad" TEXT,
    "asesor" TEXT,
    "fecha" TEXT,
    "clienteNombre" TEXT,
    "clienteCC" TEXT,
    "clienteCCDe" TEXT,
    "clienteDireccion" TEXT,
    "clienteTelefono" TEXT,
    "clienteEmail" TEXT,
    "clienteFuncionario" TEXT,
    "clienteDesdeHace" TEXT,
    "municipioTrabajo" TEXT,
    "empresaTrabajo" TEXT,
    "departamento" TEXT,
    "sumaTotal" TEXT,
    "numeroCuotas" TEXT,
    "valorCuota" TEXT,
    "mesCobro" TEXT,
    "tipoCuenta" TEXT,
    "numeroCuenta" TEXT,
    "banco" TEXT,
    "productos" JSONB,
    "formaPago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibranzaData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibranzaData_contractId_key" ON "LibranzaData"("contractId");

-- CreateIndex
CREATE INDEX "LibranzaData_contractId_idx" ON "LibranzaData"("contractId");

-- AddForeignKey
ALTER TABLE "LibranzaData" ADD CONSTRAINT "LibranzaData_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
