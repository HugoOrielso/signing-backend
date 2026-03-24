type ContractInput = {
  title: string;
  contractNumber?: string | null;
  contractType?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  subject?: string | null;
  amount?: number | null;
  currency?: string;
  paymentMethod?: string | null;
};

function parseAmount(rawAmount: unknown): number | null {
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    return null;
  }

  if (typeof rawAmount === "number") {
    return Number.isNaN(rawAmount) ? null : rawAmount;
  }

  const normalized = String(rawAmount)
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/COP/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!normalized) return null;

  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

export function buildContractData(body: any, isNewFormat: boolean): ContractInput {
  if (isNewFormat) {
    return {
      title: body.title,
      contractNumber: body.contractNumber ?? null,
      contractType: body.contractType ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      subject: body.subject ?? null,
      amount: parseAmount(body.amount),
      currency: body.currency ?? "COP",
      paymentMethod: body.paymentMethod ?? null,
    };
  }

  const { generalData } = body;
  const parsedAmount = parseAmount(generalData.amount);

  return {
    title: generalData.title,
    contractNumber: generalData.contractNumber ?? null,
    contractType: generalData.contractType ?? null,
    startDate: generalData.startDate ? new Date(generalData.startDate) : null,
    endDate: generalData.endDate ? new Date(generalData.endDate) : null,
    subject: generalData.subject ?? null,
    amount: parsedAmount,
    currency: generalData.currency ?? "COP",
    paymentMethod: generalData.paymentMethod ?? null,
  };
}