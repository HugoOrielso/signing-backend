export type TemplateKey = "dimcultura" | "gruculcol" | "gruculcolplus";

export const DEFAULT_TEMPLATE_KEY: TemplateKey = "dimcultura";

export const TEMPLATE_CONFIG: Record<
  TemplateKey,
  {
    logoFile: string;
    logoEmailUrl: string;
    nombre: string;
    subtitulo: string;
    slogan: string;
    nit: string;
    email: string;
    web: string;
  }
> = {
  dimcultura: {
    logoFile: "logo_dimcultura.png",
    logoEmailUrl: "https://dimcultura.com/assets/logo_dimcultura.png",
    nombre: "Dimcultura S.A.S.",
    subtitulo: "Nueva Dimensión Cultural",
    slogan: "Un mundo en el que debes estar",
    nit: "900.683.382-3",
    email: "servicioalcliente@dimcultura.com",
    web: "www.dimcultura.com",
  },
  gruculcol: {
    logoFile: "gruculcol.png",
    logoEmailUrl: "https://dimcultura.com/assets/gruculcol.png",
    nombre: "GRUCULCOL",
    subtitulo: "Grupo Cultural Colombiano",
    slogan: "Educación sin fronteras",
    nit: "27.898.189-5",
    email: "servicioalcliente@dimcultura.com",
    web: "www.dimcultura.com",
  },
  gruculcolplus: {
    logoFile: "gruculcol.png",
    logoEmailUrl: "https://dimcultura.com/assets/gruculcol_plus.png",
    nombre: "GRUCULCOL PLUS",
    subtitulo: "Grupo Cultural Colombiano Plus S.A.S.",
    slogan: "Educando generaciones",
    nit: "901978682-9",
    email: "servicioalcliente@dimcultura.com",
    web: "www.dimcultura.com",
  },
};

export function resolveTemplateKey(value?: string | null): TemplateKey {
  const normalized = String(value ?? "").trim().toLowerCase();

  return normalized in TEMPLATE_CONFIG
    ? (normalized as TemplateKey)
    : DEFAULT_TEMPLATE_KEY;
}

export function getTemplateConfig(value?: string | null) {
  return TEMPLATE_CONFIG[resolveTemplateKey(value)];
}