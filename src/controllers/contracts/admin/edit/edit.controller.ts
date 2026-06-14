import { prisma } from "../../../../database/db";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";
import { EditContractBody, EditContractSchema } from "../../../../schemas/libranza/createContract.schema";
import { validateAssignedContract } from "../../../../utils/validateAnalystOwnership";
import { AdminRole } from "../../../../generated/prisma/enums";

export async function editLibranza(req: AuthenticatedRequest, res: Response) {
    try {
        const id = req.params.id as string;

        if (!req.user) {
            return res.status(401).json({
                ok: false,
                message: "usuario no identificado",
            });
        }

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: "Falta el id del contrato",
            });
        }

        const parsed = EditContractSchema.safeParse(req.body);

        if (!parsed.success) {

            return res.status(400).json({
                ok: false,
                message: "Errores de validación",
                errors: parsed.error.flatten(),
            });
        }

        const data: EditContractBody = parsed.data;

        const {
            ciudad,
            claveHumano,
            asesor,
            fecha,
            clienteNombre,
            clienteCC,
            clienteCCDe,
            clienteDireccion,
            clienteTelefono,
            clienteEmail,
            clienteFuncionario,
            clienteDesdeHace,
            clienteFechaNacimiento,
            clienteFechaExpedicionCC,

            references = [],

            municipioTrabajo,
            empresaTrabajo,
            departamento,

            pagaduriaNombre,
            pagaduriaMunicipio,
            pagaduriaDepartamento,
            tipoContrato,

            sumaTotal,
            numeroCuotas,
            valorCuota,
            mesCobro,

            tipoCuenta,
            numeroCuenta,
            banco,

            productos,
            formaPago,
        } = data;

        const contract = await prisma.contract.findUnique({
            where: { id },
            include: {
                libranzaData: {
                    include: {
                        references: true,
                    },
                },
                parties: true,
                signers: true,
            },
        });

        if (!contract) {
            return res.status(404).json({
                ok: false,
                message: "Contrato no encontrado",
            });
        }

        const permission = validateAssignedContract({
            userId: req.user.id,
            userRole: req.user.role as AdminRole,
            assignedToId: contract.assignedToId,
        });


        if (!permission.ok) {
            return res.status(403).json({
                ok: false,
                message: permission.message,
            });
        }

        if (!contract.libranzaData) {
            return res.status(400).json({
                ok: false,
                message: "Este contrato no tiene libranza",
            });
        }

        if (contract.status === "SIGNED") {
            return res.status(400).json({
                ok: false,
                message: "No se puede editar una libranza firmada",
            });
        }

        if (contract.status === "CANCELLED") {
            return res.status(400).json({
                ok: false,
                message: "No se puede editar una libranza cancelada",
            });
        }

        await prisma.$transaction(async (tx) => {
            /**
             * 🔹 1. LIBRANZA DATA (CLAVE)
             */
            await tx.libranzaData.update({
                where: { id: contract.libranzaData!.id },
                data: {
                    ciudad,
                    asesor,
                    fecha,
                    claveHumano,
                    clienteNombre,
                    clienteCC,
                    clienteCCDe,
                    clienteDireccion,
                    clienteTelefono,
                    clienteEmail,
                    clienteFuncionario,
                    clienteDesdeHace,

                    clienteFechaNacimiento: clienteFechaNacimiento
                        ? new Date(clienteFechaNacimiento)
                        : null,

                    clienteFechaExpedicionCC: clienteFechaExpedicionCC
                        ? new Date(clienteFechaExpedicionCC)
                        : null,

                    municipioTrabajo,
                    empresaTrabajo,
                    departamento,

                    pagaduriaNombre,
                    pagaduriaMunicipio,
                    pagaduriaDepartamento,
                    tipoContrato,

                    sumaTotal,
                    numeroCuotas,
                    valorCuota,
                    mesCobro,

                    tipoCuenta,
                    numeroCuenta,
                    banco,

                    productos: productos ?? undefined, // 🔥 IMPORTANTE
                    formaPago,
                },
            });

            /**
             * 🔹 2. PARTY DEUDOR
             */
            const deudorParty = await tx.contractParty.findFirst({
                where: {
                    contractId: contract.id,
                    role: "DEUDOR",
                },
            });

            if (deudorParty) {
                await tx.contractParty.update({
                    where: { id: deudorParty.id },
                    data: {
                        name: clienteNombre ?? '',
                        identification: clienteCC,
                        email: clienteEmail,
                        phone: clienteTelefono,
                        address: clienteDireccion,
                    },
                });
            }

            /**
             * 🔹 3. SIGNER
             */
            const signer = await tx.contractSigner.findFirst({
                where: {
                    contractId: contract.id,
                    partyRole: "DEUDOR",
                },
            });

            if (signer) {
                await tx.contractSigner.update({
                    where: { id: signer.id },
                    data: {
                        name: clienteNombre ?? '',
                        email: clienteEmail,
                        phone: clienteTelefono,
                    },
                });
            }

            /**
             * 🔹 4. REFERENCES
             */
            await tx.reference.deleteMany({
                where: {
                    libranzaId: contract.libranzaData!.id,
                },
            });

            if (references.length > 0) {
                await tx.reference.createMany({
                    data: references.map((ref: any) => ({
                        libranzaId: contract.libranzaData!.id,
                        type: ref.type,
                        name: ref.name,
                        phone: ref.phone?.trim() || null,
                        email: ref.email?.trim() || null,
                        relationShip: ref.relationShip?.trim() || null,
                        company: ref.company?.trim() || null,
                        position: ref.position?.trim() || null,
                    })),
                });
            }

            /**
             * 🔹 5. CONTRACT
             */
            await tx.contract.update({
                where: { id: contract.id },
                data: {
                    amount: sumaTotal,
                },
            });
        });

        return res.status(200).json({
            ok: true,
            message: "Libranza editada correctamente",
        });

    } catch (error) {
        console.error("EDIT LIBRANZA ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "No se pudo editar la libranza",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
}