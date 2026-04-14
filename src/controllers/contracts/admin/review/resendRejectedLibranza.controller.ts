import { prisma } from "../../../../database/db";
import { rejectedSchema } from "../../../../schemas/libranza/rejectedContract.schema";
import { AuthenticatedRequest } from "../../../../types/types";
import type { Response } from "express";

export async function resendRejectedLibranza(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                ok: false,
                message: "Falta el id del contrato",
            });
        }

        const parsed = rejectedSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                ok: false,
                message: "Errores de validación",
                errors: parsed.error.flatten(),
            });
        }

        const data = parsed.data;

        const {
            ciudad,
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
            productos, // recibido pero no persistido aquí
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
                documents: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!contract) {
            return res.status(404).json({
                ok: false,
                message: "Contrato no encontrado",
            });
        }

        if (!contract.libranzaData) {
            return res.status(400).json({
                ok: false,
                message: "Este contrato no tiene datos de libranza",
            });
        }

        if (contract.dataReviewStatus !== "REJECTED") {
            return res.status(400).json({
                ok: false,
                message: "Solo se puede reenviar una libranza rechazada",
            });
        }

        if (contract.status !== "PENDING_VERIFICATION") {
            return res.status(400).json({
                ok: false,
                message: "Este contrato no está disponible para corrección",
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.libranzaData.update({
                where: {
                    id: contract.libranzaData!.id,
                },
                data: {
                    ciudad,
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

                    formaPago,
                },
            });

            await tx.reference.deleteMany({
                where: {
                    libranzaId: contract.libranzaData!.id,
                },
            });

            if (Array.isArray(references) && references.length > 0) {
                await tx.reference.createMany({
                    data: references.map((ref: any) => ({
                        libranzaId: contract.libranzaData!.id,
                        type: ref.type,
                        name: ref.name,
                        phone: ref.phone,
                        email: ref.email?.trim() ? ref.email.trim() : null,
                        relationShip: ref.relationShip?.trim()
                            ? ref.relationShip.trim()
                            : null,
                        company: ref.company?.trim() ? ref.company.trim() : null,
                        position: ref.position?.trim() ? ref.position.trim() : null,
                    })),
                });
            }

            await tx.contract.update({
                where: { id: contract.id },
                data: {
                    dataReviewStatus: "PENDING",
                    dataReviewNotes: null,
                    status: "PENDING_VERIFICATION",
                },
            });
        });

        return res.status(200).json({
            ok: true,
            message:
                "La información fue actualizada correctamente y enviada nuevamente a revisión",
        });
    } catch (error) {
        console.error("RESEND REJECTED LIBRANZA ERROR:", error);
        return res.status(500).json({
            ok: false,
            message: "No se pudo reenviar la información",
        });
    }
}