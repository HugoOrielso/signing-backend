import { PartyInput } from "../../controllers/contracts/admin/createContract/services/buildParties";
import { parseDateOnly } from "../../helpers/parseData";
import { CreateContractBody } from "../../schemas/libranza/createContract.schema";

export interface BuildLibranzaDataResult {
  ciudad: string | null;
  asesor: string | null;
  fecha: string | null;

  clienteNombre: string | null;
  clienteCC: string | null;
  clienteCCDe: string | null;
  clienteDireccion: string | null;
  clienteTelefono: string | null;
  clienteEmail: string | null;
  clienteFuncionario: string | null;
  clienteDesdeHace: string | null;

  clienteFechaNacimiento: Date | null;
  clienteFechaExpedicionCC: Date | null;

  municipioTrabajo: string | null;
  empresaTrabajo: string | null;
  departamento: string | null;

  pagaduriaNombre: string | null;
  pagaduriaMunicipio: string | null;
  pagaduriaDepartamento: string | null;

  tipoContrato:
    | "PROVISIONAL"
    | "TEMPORAL"
    | "PROVISIONAL_VACANTE_DEFINITIVA"
    | "CARRERA_ADMINISTRATIVA"
    | "PENSIONADO"
    | null;

  sumaTotal: string | null;
  numeroCuotas: string | null;
  valorCuota: string | null;
  mesCobro: string | null;

  tipoCuenta: string | null;
  numeroCuenta: string | null;
  banco: string | null;

  productos: CreateContractBody["productos"];

  references: {
    create: Array<{
      type: "PERSONAL" | "LABORAL";
      name: string;
      phone: string | null;
      email: string | null;
      company: string | null;
      position: string | null;
      relationShip: string | null;
    }>;
  };

  formaPago: string | null;
}

export function buildLibranzaData(
  body: CreateContractBody,
  contractedParty?: PartyInput
): BuildLibranzaDataResult {
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

    clienteFechaNacimiento: parseDateOnly(body.clienteFechaNacimiento),
    clienteFechaExpedicionCC: parseDateOnly(body.clienteFechaExpedicionCC),

    municipioTrabajo: body.municipioTrabajo ?? null,
    empresaTrabajo: body.empresaTrabajo ?? null,
    departamento: body.departamento ?? null,

    pagaduriaNombre: body.pagaduriaNombre ?? null,
    pagaduriaMunicipio: body.pagaduriaMunicipio ?? null,
    pagaduriaDepartamento: body.pagaduriaDepartamento ?? null,

    tipoContrato: body.tipoContrato ?? null,

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
            .filter((ref) => ref?.name?.trim())
            .map((ref) => ({
              type: ref?.type === "LABORAL" ? "LABORAL" : "PERSONAL",
              name: ref.name.trim(),
              phone: ref?.phone ?? null,
              email: ref?.email ?? null,
              company: ref?.company ?? null,
              position: ref?.position ?? null,
              relationShip: ref?.relationShip ?? null,
            }))
        : [],
    },

    formaPago: body.formaPago ?? null,
  };
}