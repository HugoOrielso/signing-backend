import type { PartyInput } from "./buildParties";

export function buildLibranzaData(body: any, contractedParty?: PartyInput | undefined) {

  return {
    ciudad: body.ciudad ?? null,
    asesor: body.asesor ?? null,
    fecha: body.fecha ?? null,

    clienteNombre: body.clienteNombre ?? contractedParty?.name ?? null,
    clienteCC: body.clienteCC ?? contractedParty?.identification ?? null,
    clienteCCDe: body.clienteCCDe ?? null,
    clienteDireccion: body.clienteDireccion ?? contractedParty?.address ?? null,
    clienteTelefono: body.clienteTelefono ?? contractedParty?.phone ?? null,
    clienteEmail: body.clienteEmail ?? contractedParty?.email ?? null,
    clienteFuncionario: body.clienteFuncionario ?? null,
    clienteDesdeHace: body.clienteDesdeHace ?? null,

    municipioTrabajo: body.municipioTrabajo ?? null,
    empresaTrabajo: body.empresaTrabajo ?? null,
    departamento: body.departamento ?? null,

    sumaTotal: body.sumaTotal ?? null,
    numeroCuotas: body.numeroCuotas ?? null,
    valorCuota: body.valorCuota ?? null,
    mesCobro: body.mesCobro ?? null,

    tipoCuenta: body.tipoCuenta ?? null,
    numeroCuenta: body.numeroCuenta ?? null,
    banco: body.banco ?? null,

    productos: Array.isArray(body.productos) ? body.productos : [],

    references: {
      create: Array.isArray(body.references)
        ? body.references
            .filter((ref: any) => ref?.name?.trim())
            .map((ref: any) => ({
              type: ref?.type === "LABORAL" ? "LABORAL" : "PERSONAL",
              name: ref.name.trim(),
              phone: ref?.phone ?? null,
              email: ref?.email ?? null,
              company: ref?.company ?? null,
              position: ref?.position ?? null,
              relationShip: ref?.relationShip ?? null
            }))
        : [],
    },

    formaPago: body.formaPago ?? null,
  };
}