export type PartyInput = {
  role: "CONTRACTOR" | "CONTRACTED";
  name: string;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export function buildParties(body: any, isNewFormat: boolean): PartyInput[] {
  if (isNewFormat) {
    return Array.isArray(body.parties) ? body.parties : [];
  }

  const { generalData } = body;

  return [
    {
      role: "CONTRACTOR",
      name: generalData.contractorName,
      identification: generalData.contractorIdentification ?? null,
      email: generalData.contractorEmail ?? null,
      phone: generalData.contractorPhone ?? null,
      address: generalData.contractorAddress ?? null,
    },
    {
      role: "CONTRACTED",
      name: generalData.contractedName,
      identification: generalData.contractedIdentification ?? null,
      email: generalData.contractedEmail ?? null,
      phone: generalData.contractedPhone ?? null,
      address: generalData.contractedAddress ?? null,
    },
  ];
}