import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

function emptyToNull(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(dateString: string): number | null {
  const birthDate = parseDateOnly(dateString);
  if (!birthDate) return null;

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

const nullableString = z.preprocess(
  emptyToNull,
  z.string().trim().optional().nullable()
);

const nullableEmail = z.preprocess(
  emptyToNull,
  z.string().trim().email("Correo inválido").optional().nullable()
);

const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Correo inválido").optional()
);

const dateOnlyString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD")
  .refine((value) => parseDateOnly(value) !== null, {
    message: "La fecha no es válida",
  });

const colombianCellphoneSchema = z
  .string()
  .trim()
  .regex(/^3\d{9}$/, "El teléfono debe ser colombiano, de 10 dígitos e iniciar en 3");

const positiveMoneySchema = z.preprocess(
  emptyToUndefined,
  z.union([z.string(), z.number()]).refine((value) => toNumber(value) > 0, {
    message: "Debe ser un valor mayor a 0",
  })
);

const positiveIntegerStringSchema = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio")
  .refine((value) => Number.isInteger(Number(value)), {
    message: "Debe ser un número entero",
  })
  .refine((value) => Number(value) > 0, {
    message: "Debe ser mayor a 0",
  });

export const contractEmploymentTypeSchema = z.enum([
  "PROVISIONAL",
  "TEMPORAL",
  "PROVISIONAL_VACANTE_DEFINITIVA",
  "CARRERA_ADMINISTRATIVA",
  "PENSIONADO",
]);

export const referenceSchema = z
  .object({
    type: z.enum(["PERSONAL", "LABORAL"]),
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    phone: colombianCellphoneSchema,
    email: optionalEmailSchema,
    company: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    position: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    relationShip: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  })
  .superRefine((ref, ctx) => {
    if (ref.type === "PERSONAL" && !ref.relationShip?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relationShip"],
        message: "El parentesco es obligatorio",
      });
    }
  });

export const productSchema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  valor: positiveMoneySchema,
});

export const clauseSchema = z.object({
  position: z.number().int().positive().optional(),
  content: z.string().trim().min(1),
});

export const signerSchema = z.object({
  name: z.string().trim().min(1, "El nombre del firmante es obligatorio"),
  email: nullableEmail,
  phone: nullableString,
  roleTitle: nullableString,
  partyRole: z.enum(["CONTRACTOR", "CONTRACTED"]).optional().nullable(),
  signerOrder: z.number().int().positive().optional(),
  signed: z.boolean().optional(),
  sigType: z.enum(["canvas", "typed"]).optional().nullable(),
  sigData: nullableString,
});

export const partySchema = z.object({
  role: z.enum(["CONTRACTOR", "CONTRACTED"]),
  name: z.string().trim().min(1, "El nombre de la parte es obligatorio"),
  identification: nullableString,
  email: nullableEmail,
  phone: nullableString,
  address: nullableString,
});

export const generalDataSchema = z.object({
  contractedEmail: nullableEmail,
  contractedName: nullableString,
});

export const createContractSchema = z
  .object({
    title: nullableString,
    subject: nullableString,
    amount: z.union([z.string(), z.number()]).optional().nullable(),
    currency: nullableString,
    paymentMethod: nullableString,
    contractType: nullableString,
    templateKey: nullableString,

    generalData: generalDataSchema.optional(),
    clauses: z.array(clauseSchema).optional(),

    ciudad: nullableString,
    asesor: nullableString,
    fecha: nullableString,

    clienteNombre: nullableString,
    clienteCC: nullableString,
    clienteCCDe: nullableString,
    clienteDireccion: nullableString,
    clienteTelefono: nullableString,
    clienteEmail: nullableEmail,
    clienteFuncionario: nullableString,
    clienteDesdeHace: nullableString,

    clienteFechaNacimiento: dateOnlyString.optional().nullable(),
    clienteFechaExpedicionCC: dateOnlyString.optional().nullable(),

    municipioTrabajo: nullableString,
    empresaTrabajo: nullableString,
    departamento: nullableString,

    pagaduriaNombre: nullableString,
    pagaduriaMunicipio: nullableString,
    pagaduriaDepartamento: nullableString,

    tipoContrato: contractEmploymentTypeSchema.optional().nullable(),

    sumaTotal: nullableString,
    numeroCuotas: nullableString,
    valorCuota: nullableString,
    mesCobro: nullableString,

    tipoCuenta: nullableString,
    numeroCuenta: nullableString,
    banco: nullableString,

    formaPago: nullableString,

    productos: z.array(productSchema).min(1, "Debe ingresar al menos un producto"),
    references: z.array(referenceSchema).optional(),

    parties: z.array(partySchema).optional(),
    signers: z.array(signerSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const isNewFormat = !data.generalData;
    const isLibranza = isNewFormat && data.contractType === "LIBRANZA";

    if (!isLibranza) return;

    const requiredStringFields: Array<[keyof typeof data, string]> = [
      ["ciudad", "La ciudad es obligatoria"],
      ["asesor", "El asesor es obligatorio"],
      ["fecha", "La fecha es obligatoria"],
      ["clienteNombre", "El nombre del cliente es obligatorio"],
      ["clienteCC", "La cédula es obligatoria"],
      ["clienteCCDe", "La ciudad de expedición es obligatoria"],
      ["clienteDireccion", "La dirección es obligatoria"],
      ["clienteTelefono", "El teléfono del cliente es obligatorio"],
      ["clienteEmail", "El correo del cliente es obligatorio"],
      ["clienteFuncionario", "La empresa del funcionario es obligatoria"],
      ["clienteDesdeHace", "Este campo es obligatorio"],
      ["clienteFechaNacimiento", "La fecha de nacimiento es obligatoria"],
      ["clienteFechaExpedicionCC", "La fecha de expedición es obligatoria"],
      ["municipioTrabajo", "El municipio de trabajo es obligatorio"],
      ["empresaTrabajo", "La empresa o entidad es obligatoria"],
      ["departamento", "El departamento es obligatorio"],
      ["pagaduriaNombre", "La pagaduría es obligatoria"],
      ["pagaduriaMunicipio", "El municipio de pagaduría es obligatorio"],
      ["pagaduriaDepartamento", "El departamento de pagaduría es obligatorio"],
      ["tipoContrato", "El tipo de contrato es obligatorio"],
      ["sumaTotal", "La suma total es obligatoria"],
      ["numeroCuotas", "El número de cuotas es obligatorio"],
      ["valorCuota", "El valor de la cuota es obligatorio"],
      ["mesCobro", "El mes de cobro es obligatorio"],
      ["tipoCuenta", "El tipo de cuenta es obligatorio"],
      ["numeroCuenta", "El número de cuenta es obligatorio"],
      ["banco", "El banco es obligatorio"],
      ["formaPago", "La forma de pago es obligatoria"],
    ];

    requiredStringFields.forEach(([field, message]) => {
      const value = data[field];
      if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message,
        });
      }
    });

    if (data.clienteTelefono && !/^3\d{9}$/.test(data.clienteTelefono.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clienteTelefono"],
        message:
          "El teléfono del cliente debe ser colombiano, de 10 dígitos e iniciar en 3",
      });
    }

    if (data.clienteFechaNacimiento) {
      const age = calculateAge(data.clienteFechaNacimiento);
      if (age === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clienteFechaNacimiento"],
          message: "La fecha de nacimiento no es válida",
        });
      } else if (age < 18 || age > 65) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clienteFechaNacimiento"],
          message:
            "No se puede realizar la libranza: la edad permitida es entre 18 y 65 años",
        });
      }
    }

    if (data.clienteFechaNacimiento && data.clienteFechaExpedicionCC) {
      const birthDate = parseDateOnly(data.clienteFechaNacimiento);
      const expeditionDate = parseDateOnly(data.clienteFechaExpedicionCC);

      if (birthDate && expeditionDate) {
        if (expeditionDate < birthDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clienteFechaExpedicionCC"],
            message:
              "La fecha de expedición no puede ser anterior a la fecha de nacimiento",
          });
        }

        const today = new Date();
        if (expeditionDate > today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clienteFechaExpedicionCC"],
            message: "La fecha de expedición no puede ser futura",
          });
        }
      }
    }

    const productos = data.productos ?? [];
    if (productos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productos"],
        message: "Debe ingresar al menos un producto",
      });
    }

    const references = data.references ?? [];
    if (references.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["references"],
        message: "Debes ingresar una referencia personal y una laboral",
      });
    } else {
      const types = references.map((r) => r.type);
      if (!types.includes("PERSONAL") || !types.includes("LABORAL")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["references"],
          message: "Debe existir una referencia personal y una laboral",
        });
      }

      const personalRef = references.find((r) => r.type === "PERSONAL");
      const laboralRef = references.find((r) => r.type === "LABORAL");

      if (personalRef && laboralRef && personalRef.phone === laboralRef.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["references", 0, "phone"],
          message: "Las referencias no pueden tener el mismo número",
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["references", 1, "phone"],
          message: "Las referencias no pueden tener el mismo número",
        });
      }

      if (data.clienteTelefono) {
        references.forEach((ref, index) => {
          if (ref.phone === data.clienteTelefono) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["references", index, "phone"],
              message:
                "La referencia no puede tener el mismo teléfono del cliente",
            });
          }
        });
      }
    }

    if (data.numeroCuotas) {
      const cuotas = Number(data.numeroCuotas);
      if (!Number.isInteger(cuotas)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numeroCuotas"],
          message: "Debe ser un número entero",
        });
      } else if (cuotas < 10 || cuotas > 22) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numeroCuotas"],
          message: "El número de cuotas debe estar entre 10 y 22",
        });
      }
    }

    const totalProductos = productos.reduce(
      (sum, producto) => sum + toNumber(producto.valor),
      0
    );
    const sumaTotal = toNumber(data.sumaTotal);
    const numeroCuotas = toNumber(data.numeroCuotas);
    const valorCuota = toNumber(data.valorCuota);

    if (productos.length > 0 && data.sumaTotal && Math.abs(totalProductos - sumaTotal) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sumaTotal"],
        message: "La suma total no coincide con el total de los productos",
      });
    }

    if (
      data.sumaTotal &&
      data.numeroCuotas &&
      data.valorCuota &&
      numeroCuotas > 0
    ) {
      const cuotaCalculada = sumaTotal / numeroCuotas;
      if (Math.abs(cuotaCalculada - valorCuota) > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valorCuota"],
          message:
            "El valor de la cuota no coincide con la suma total dividida entre el número de cuotas",
        });
      }
    }
  });

export type CreateContractBody = z.infer<typeof createContractSchema>;
export type ContractEmploymentType = z.infer<typeof contractEmploymentTypeSchema>;
export type ReferenceInput = z.infer<typeof referenceSchema>;
export type ProductInput = z.infer<typeof productSchema>;