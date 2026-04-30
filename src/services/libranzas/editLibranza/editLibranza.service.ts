import { buildContractData } from "../../../controllers/contracts/admin/createContract/services/buildContractData";
import { buildParties } from "../../../controllers/contracts/admin/createContract/services/buildParties";
import { prisma } from "../../../database/db";
import { CreateContractBody } from "../../../schemas/libranza/createContract.schema";
import { buildLibranzaData } from "../../../types/libranza/buildLibranza";
import { AuthenticatedRequest } from "../../../types/types";

export async function editLibranzaService(
  contractId: string,
  body: CreateContractBody,
  req: AuthenticatedRequest
) {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;

  if (!adminId) {
    throw new Error("Usuario no autenticado");
  }

  if (adminRole !== "CREDIT_ANALYST" && adminRole !== "ADMIN") {
    throw new Error("NO_PERMISSIONS");
  }

  const existingContract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      assignedToId: true,
    },
  });

  if (!existingContract) {
    throw new Error("LIBRANZA_NOT_FOUND");
  }

  if (existingContract.status === "SIGNED") {
    throw new Error("LIBRANZA_SIGNED");
  }

  if (existingContract.status === "CANCELLED") {
    throw new Error("LIBRANZA_CANCELLED");
  }

  if (
    existingContract.assignedToId &&
    existingContract.assignedToId !== adminId
  ) {
    throw new Error("LIBRANZA_TAKEN_BY_OTHER");
  }

  const isNewFormat = !body.generalData;
  const isLibranza = isNewFormat && body.contractType === "LIBRANZA";

  const contractData = buildContractData(body, isNewFormat);
  const partiesInput = buildParties(body, isNewFormat);

  const deudorParty = partiesInput.find((p) => p.role === "DEUDOR");

  const libranzaInput = isLibranza
    ? buildLibranzaData(body, deudorParty)
    : null;

  if (libranzaInput?.clienteCC) {
    const libranzasByUserCC = await prisma.contract.findMany({
      where: {
        id: {
          not: contractId,
        },
        libranzaData: {
          clienteCC: libranzaInput.clienteCC,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const hasActiveLibranza = libranzasByUserCC.some(
      (l) => l.status !== "SIGNED" && l.status !== "CANCELLED"
    );

    if (hasActiveLibranza) {
      throw new Error("EXISTEN_LIBRANZAS_NO_FIRMADAS");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    /**
     * 1. Actualizar o crear la parte DEUDOR
     */
    if (deudorParty) {
      const existingParty = await tx.contractParty.findFirst({
        where: {
          contractId,
          role: "DEUDOR",
        },
        select: { id: true },
      });

      if (existingParty) {
        await tx.contractParty.update({
          where: { id: existingParty.id },
          data: {
            name: deudorParty.name,
            identification: deudorParty.identification ?? null,
            email: deudorParty.email ?? null,
            phone: deudorParty.phone ?? null,
            address: deudorParty.address ?? null,
          },
        });
      } else {
        await tx.contractParty.create({
          data: {
            contractId,
            role: deudorParty.role,
            name: deudorParty.name,
            identification: deudorParty.identification ?? null,
            email: deudorParty.email ?? null,
            phone: deudorParty.phone ?? null,
            address: deudorParty.address ?? null,
          },
        });
      }
    }

    /**
     * 2. Actualizar o crear firmante DEUDOR
     */
    const existingSigner = await tx.contractSigner.findFirst({
      where: {
        contractId,
        partyRole: "DEUDOR",
      },
      select: { id: true },
    });

    if (existingSigner) {
      await tx.contractSigner.update({
        where: { id: existingSigner.id },
        data: {
          name: deudorParty?.name ?? "",
          email: deudorParty?.email ?? null,
          phone: deudorParty?.phone ?? null,
          signerOrder: 1,
        },
      });
    } else {
      await tx.contractSigner.create({
        data: {
          contractId,
          name: deudorParty?.name ?? "",
          email: deudorParty?.email ?? null,
          phone: deudorParty?.phone ?? null,
          partyRole: "DEUDOR",
          signerOrder: 1,
        },
      });
    }

    /**
     * 3. Actualizar o crear LibranzaData
     */
    if (libranzaInput) {
      await tx.libranzaData.upsert({
        where: { contractId },
        update: {
          ciudad: libranzaInput.ciudad ?? null,
          asesor: libranzaInput.asesor ?? null,
          fecha: libranzaInput.fecha ?? null,

          clienteNombre: libranzaInput.clienteNombre ?? null,
          clienteCC: libranzaInput.clienteCC ?? null,
          clienteCCDe: libranzaInput.clienteCCDe ?? null,
          clienteDireccion: libranzaInput.clienteDireccion ?? null,
          clienteTelefono: libranzaInput.clienteTelefono ?? null,
          clienteEmail: libranzaInput.clienteEmail ?? null,
          clienteFuncionario: libranzaInput.clienteFuncionario ?? null,
          clienteDesdeHace: libranzaInput.clienteDesdeHace ?? null,

          clienteFechaNacimiento:
            libranzaInput.clienteFechaNacimiento ?? null,
          clienteFechaExpedicionCC:
            libranzaInput.clienteFechaExpedicionCC ?? null,

          municipioTrabajo: libranzaInput.municipioTrabajo ?? null,
          empresaTrabajo: libranzaInput.empresaTrabajo ?? null,
          departamento: libranzaInput.departamento ?? null,

          pagaduriaNombre: libranzaInput.pagaduriaNombre ?? null,
          pagaduriaMunicipio: libranzaInput.pagaduriaMunicipio ?? null,
          pagaduriaDepartamento:
            libranzaInput.pagaduriaDepartamento ?? null,
          tipoContrato: libranzaInput.tipoContrato ?? null,

          sumaTotal: Number(libranzaInput.sumaTotal),
          numeroCuotas: Number(libranzaInput.numeroCuotas),
          valorCuota: Number(libranzaInput.valorCuota),
          mesCobro: libranzaInput.mesCobro ?? null,

          tipoCuenta: libranzaInput.tipoCuenta ?? null,
          numeroCuenta: libranzaInput.numeroCuenta ?? null,
          banco: libranzaInput.banco ?? null,

          productos: libranzaInput.productos ?? undefined,
          formaPago: libranzaInput.formaPago ?? null,
        },
        create: {
          contractId,

          ciudad: libranzaInput.ciudad ?? null,
          asesor: libranzaInput.asesor ?? null,
          fecha: libranzaInput.fecha ?? null,

          clienteNombre: libranzaInput.clienteNombre ?? null,
          clienteCC: libranzaInput.clienteCC ?? null,
          clienteCCDe: libranzaInput.clienteCCDe ?? null,
          clienteDireccion: libranzaInput.clienteDireccion ?? null,
          clienteTelefono: libranzaInput.clienteTelefono ?? null,
          clienteEmail: libranzaInput.clienteEmail ?? null,
          clienteFuncionario: libranzaInput.clienteFuncionario ?? null,
          clienteDesdeHace: libranzaInput.clienteDesdeHace ?? null,

          clienteFechaNacimiento:
            libranzaInput.clienteFechaNacimiento ?? null,
          clienteFechaExpedicionCC:
            libranzaInput.clienteFechaExpedicionCC ?? null,

          municipioTrabajo: libranzaInput.municipioTrabajo ?? null,
          empresaTrabajo: libranzaInput.empresaTrabajo ?? null,
          departamento: libranzaInput.departamento ?? null,

          pagaduriaNombre: libranzaInput.pagaduriaNombre ?? null,
          pagaduriaMunicipio: libranzaInput.pagaduriaMunicipio ?? null,
          pagaduriaDepartamento:
            libranzaInput.pagaduriaDepartamento ?? null,
          tipoContrato: libranzaInput.tipoContrato ?? null,

          sumaTotal: Number(libranzaInput.sumaTotal),
          numeroCuotas: Number(libranzaInput.numeroCuotas),
          valorCuota: Number(libranzaInput.valorCuota),
          mesCobro: libranzaInput.mesCobro ?? null,

          tipoCuenta: libranzaInput.tipoCuenta ?? null,
          numeroCuenta: libranzaInput.numeroCuenta ?? null,
          banco: libranzaInput.banco ?? null,

          productos: libranzaInput.productos ?? undefined,
          formaPago: libranzaInput.formaPago ?? null,
        },
      });
    }

    /**
     * 4. Actualizar datos principales del contrato
     */
    return tx.contract.update({
      where: { id: contractId },
      data: {
        ...contractData,
        assignedToId: adminId,
        assignedAt: new Date(),
      },
      include: {
        parties: true,
        clauses: true,
        signers: {
          orderBy: { signerOrder: "asc" },
        },
        libranzaData: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });

  return updated;
}