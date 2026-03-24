export type SignerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  roleTitle?: string | null;
  partyRole?: "CONTRACTOR" | "CONTRACTED" | null;
  signerOrder?: number;
  signed?: boolean;
  sigType?: string;
  sigData?: string;
};

export function buildSigners(body: any, isNewFormat: boolean): SignerInput[] {
  if (isNewFormat) {
    return Array.isArray(body.signers) ? body.signers : [];
  }

  return Array.isArray(body.signers) ? body.signers : [];
}