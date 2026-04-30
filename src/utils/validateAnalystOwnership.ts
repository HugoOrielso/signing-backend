import { AdminRole } from "../generated/prisma/enums";

export function validateAssignedContract({
  userId,
  userRole,
  assignedToId,
}: {
  userId: string;
  userRole: AdminRole;
  assignedToId?: string | null;
}) {
  if (userRole !== "CREDIT_ANALYST") {
    return {
      ok: true,
      message: null,
    };
  }

  if (!assignedToId) {
    return {
      ok: false,
      message: "Este contrato no tiene analista asignado",
    };
  }

  if (assignedToId !== userId) {
    return {
      ok: false,
      message: "No tienes permisos para revisar documentos de este contrato",
    };
  }

  return {
    ok: true,
    message: null,
  };
}