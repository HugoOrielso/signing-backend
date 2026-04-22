import { createHash } from 'crypto';
import { AdminRole, AuditActorType, AuditEventType } from '../../generated/prisma/enums';
import { prisma } from '../../database/db';


interface AuditLogParams {
  contractId: string;
  eventType: AuditEventType;
  actorType: AuditActorType;
  // Estos son opcionales según quién realice la acción
  adminId?: string;
  signerId?: string;
  actorRole?: AdminRole;
  actorName?: string;
  actorEmail?: string;
  // Metadatos adicionales (ej: campos cambiados, info de error, etc.)
  metadata?: any;
  // Información de red/cliente
  ipAddress?: string;
  userAgent?: string;
  documentHash?: string;
}

/**
 * Registra un evento de auditoría de forma dinámica y encadenada.
 */
export async function auditLog(params: AuditLogParams) {
  const { contractId, eventType, actorType, ...rest } = params;

  // 1. Obtener el último evento para crear el encadenamiento (previousEventHash)
  const lastEvent = await prisma.contractAuditEvent.findFirst({
    where: { contractId },
    orderBy: { createdAt: 'desc' },
    select: { eventHash: true }
  });

  const previousHash = lastEvent?.eventHash || "0";

  // 2. Generar un hash para el evento actual (Integridad)
  const dataToHash = `${contractId}-${eventType}-${Date.now()}-${previousHash}`;
  const currentEventHash = createHash('sha256').update(dataToHash).digest('hex');

  // 3. Crear el registro en la DB
  return await prisma.contractAuditEvent.create({
    data: {
      contractId,
      eventType,
      actorType,
      adminId: rest.adminId,
      signerId: rest.signerId,
      actorRole: rest.actorRole,
      actorName: rest.actorName,
      actorEmail: rest.actorEmail,
      ipAddress: rest.ipAddress,
      userAgent: rest.userAgent,
      documentHash: rest.documentHash,
      metadata: rest.metadata || {},
      previousEventHash: previousHash,
      eventHash: currentEventHash,
    },
  });
}