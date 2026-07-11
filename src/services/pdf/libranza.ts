// src/lib/libranzaHtml.ts
// Genera el HTML de la libranza idéntico al preview del frontend
// Este HTML es el que Puppeteer convierte a PDF

import { ReferenceType } from "../../generated/prisma/enums";
import { Box, Chk, escHtml, F, FM, U, UF } from "../../helpers/pdfFormaters";
import { getTemplateConfig, resolveTemplateKey } from "../../lib/email/templateConfig";

interface ProductoItem {
  codigo: string;
  descripcion: string;
  valor: string;
}

interface UserReference {
  type: ReferenceType,
  name: string,
  phone: string,
  email: string,
  company?: string,
  position?: string
  relationShip?: string
}

interface LibranzaData {
  ciudad?: string | null;
  claveHumano?: string | null;
  asesor?: string | null;
  fecha?: string | null;
  clienteNombre?: string | null;
  clienteCC?: string | null;
  clienteCCDe?: string | null;
  clienteDireccion?: string | null;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  clienteFuncionario?: string | null;
  clienteDesdeHace?: string | null;
  municipioTrabajo?: string | null;
  empresaTrabajo?: string | null;
  departamento?: string | null;
  sumaTotal: number;
  numeroCuotas: number;
  valorCuota: number;
  mesCobro?: string | null;
  tipoCuenta?: string | null;
  numeroCuenta?: string | null;
  banco?: string | null;
  productos?: ProductoItem[] | null;
  formaPago?: string | null;
  templateKey: string
  references: UserReference[]
}

interface SignatureData {
  type: "DRAWN" | "TYPED" | "CLICK_TO_SIGN";
  imageUrl?: string | null;
  typedValue?: string | null;
  signedAt?: string | null;
  signerName?: string;
}


interface GenerateLibranzaHtmlOptions {
  templateKey?: string | null;
  signature?: SignatureData;
  logoBase64?: string;
  logoMime?: string;
  audience?: "client" | "admin";
  consecutivo?: string; // ← agregar
}

export async function generateLibranzaHtml(
  d: LibranzaData,
  options: GenerateLibranzaHtmlOptions = {}
): Promise<string> {
  const {
    templateKey,
    signature,
    logoBase64,
    logoMime = "image/webp",
  } = options;
  const isAdmin = options.audience === "admin";

  async function imageUrlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error al obtener imagen: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = response.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${base64}`;
  }

  const moneyPdf = (value: string | number | null | undefined) => {
    const cleanValue = String(value ?? "").replace(/\D/g, "");

    if (!cleanValue) return "";

    return Number(cleanValue).toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  // ✅ Resuelve la firma antes de construir el HTML
  let sigZone = "";

  if (signature) {
    if (signature.type === "DRAWN" && signature.imageUrl) {
      const base64Img = await imageUrlToBase64(signature.imageUrl);

      sigZone = `
      <img 
        src="${base64Img}" 
        style="max-height:44px;max-width:100%;object-fit:contain" 
        alt="firma"
      >
    `;
    } else if (signature.type === "TYPED" && signature.typedValue) {
      sigZone = `
      <span 
        class="signature-font"
        style="
          font-size:22px;
          color:#1a1a2e;
          line-height:1;
          display:inline-block;
        "
      >
        ${escHtml(signature.typedValue)}
      </span>
    `;
    }
  } else {
    sigZone = `
    <span 
      style="
        font-size:7.5px;
        color:#9ca3af;
        letter-spacing:1px;
      "
    >
      PENDIENTE DE FIRMA
    </span>
  `;
  }

  const resolvedTemplateKey = resolveTemplateKey(templateKey);
  const template = getTemplateConfig(resolvedTemplateKey);
  const total = (d.productos ?? []).reduce(
    (s, p) => s + (parseFloat(p.valor?.replace(/[^0-9.]/g, "") || "0") || 0), 0
  );

  const formaPagos = ["NOMINA"];

  // Fecha split
  const fechaParts = d.fecha?.split("/") ?? ["", "", ""];

  // Firma en la zona


  const sigBorder = signature ? "2px solid #2d6a4f" : "2px solid #c9a84c";

  // Tabla productos
  const productoRows = (d.productos ?? []).map(p => `
    <tr>
      <td style="${tdStyle}">${escHtml(p.codigo || "")}</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}">${escHtml(p.descripcion || "")}</td>
      <td style="${tdStyle};text-align:right">${p.valor ? `$${moneyPdf(p.valor)}` : ""}</td>
    </tr>`).join("");

  const emptyRows = Math.max(0, 2 - (d.productos?.length ?? 0));
  const emptyRowsHtml = Array.from({ length: emptyRows }).map(() => `
    <tr>
      <td style="${tdStyle}">&nbsp;</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
    </tr>`).join("");

  const logoHeight =
    resolvedTemplateKey === "gruculcolplus" ? 96 : 100;

  const logoHtml = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" style="height:${logoHeight}px;width:auto" alt="${escHtml(template.nombre)}">`
    : `<div style="width:60px;height:52px;border:1px solid #000;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#1a1a2e">D</div>`;
    

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: white; padding: 12px 16px; line-height: 1.45; }
  @page { size: A4; margin: 0; }
  @media print { body { padding: 8px 12px; } }
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

.signature-font {
  font-family: 'Great Vibes', cursive;
}
</style>
</head>
<body>

<!-- HEADER -->
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #a1a1a1;padding-bottom:5px;margin-bottom:5px">
  <div style="flex-shrink:0">${logoHtml}</div>

  <div style="text-align:center;flex:1;margin:0 8px">
<div style="font-size:14px;font-weight:700">${escHtml(template.subtitulo)}</div>
<div style="font-size:19px;font-weight:900">${escHtml(template.nombre)}</div>
<div style="font-size:11px;font-style:italic">"${escHtml(template.slogan)}"</div>
<div style="font-size:8px;margin-top:1px">Nit. ${escHtml(template.nit)} · Tel. 310 207 98 00 / 311 861 01 61</div>
  </div>

  <div style="font-size:10px;border:1px solid #a1a1a1;padding:4px; border-radius:2.4px">
    <div style="display:flex;gap:4px;margin-bottom:3px">
      <span style="font-weight:700;white-space:nowrap">CIUDAD:</span>
      <span style="border-bottom:1px solid #a1a1a1;flex:1">${F(d.ciudad)}</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:3px">
      <span style="font-weight:700;white-space:nowrap">ASESOR:</span>
      <span style="border-bottom:1px solid #a1a1a1;flex:1">${F(d.asesor)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:2px">
      <span style="font-weight:700;white-space:nowrap">FECHA:</span>
      <span style="text-align:center;padding:0px">${escHtml(fechaParts[0] || "")}</span>
      <span style="font-weight:700;font-size:14px;margin-left:3px">  LIBRANZA - ${escHtml(options.consecutivo ?? "")}</span>
    </div>
    <div style="display:flex;gap:4px;margin-top:3px">
      <span style="font-weight:700;white-space:nowrap">CLAVE:</span>
      <span style="border-bottom:1px solid #a1a1a1;flex:1">${F(d.claveHumano)}</span>
    </div>
  </div>
</div>

<!-- SEDE -->
<div style="text-align:center;font-size:8px;margin-bottom:5px;border-bottom:1px solid #ccc;padding-bottom:3px">
  Sede Administrativa: Calle 24 No. 5-40 Conjunto los Ángeles Barrio Gran Colombia Casa G1
  Villa del Rosario Col/ Dirección Cartagena: Lote 1 Barrio El Country Tel. 6512857 &nbsp;
  <strong>servicioalcliente@dimcultura.com · www.dimcultura.com</strong>
</div>

<!-- CUERPO -->
<div style="font-size:12px;margin-bottom:5px;text-wrap: balance;">
  Yo ${U(F(d.clienteNombre))}
  con C.C.${U(F(d.clienteCC))}
  De ${U(F(d.clienteCCDe))},
  residente en ${U(F(d.clienteDireccion))}
  con número de contacto ${U(F(d.clienteTelefono))} y correo
  de notificación ${U(F(d.clienteEmail))}
  Funcionario de ${U(F(d.clienteFuncionario))}
  Desde hace ${U(F(d.clienteDesdeHace))}
  Actualmente trabajo en el municipio de ${U(F(d.municipioTrabajo))},
  me permito autorizar por medio de este, al Señor pagador de
  ${U(F(d.empresaTrabajo))},
  departamento ${U(F(d.departamento))},
  para que descuente de mi sueldo o de cualquier otro concepto la
  suma de $${Box(moneyPdf(d.sumaTotal))}
  en ${Box(F(d.numeroCuotas.toString()))}
  cuotas mensuales consecutivas por valor de $${Box(moneyPdf(d.valorCuota))}, cada una, a partir
  del mes de ${Box(F(d.mesCobro))}
  y pagarlos a la orden de <strong>${escHtml(template.nombre.toUpperCase())}</strong>
  <br/>
  <span> <b>Nota:</b>  en caso de que el cupo de mi nómina no sea suficiente para cubrir la obligación mensual, autorizo a la empresa para que debite los valores pactados en este documento, de mi cuenta</span>
  <strong>Ahorros</strong> ${Chk(d.tipoCuenta === "Ahorros")}
  <strong>Corriente</strong> ${Chk(d.tipoCuenta === "Corriente")}
  No. ${U(F(d.numeroCuenta))}
  DEL BANCO ${U(F(d.banco))}
  <span style="font-size:10px"> Declaro formalmente no tener nada que reclamar a <strong>${escHtml(template.nombre.toUpperCase())}</strong> judicial o extrajudicialmente, por los cargos que a través de la presente autorización, se realice de mi cuenta.</span>
</div>

<!-- REFERIDOS -->
<div style="border:1px solid #ccc;border-radius:4px;padding:4px;margin-bottom:6px;font-size:12px;">
  <div style="font-weight:700;margin-bottom:6px;">
    Referencias laborales y/o personales:
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
    ${d.references
      .map((r) => {
        if (r.type === "PERSONAL") {
          return `
              <div>
                <div style="display:grid;grid-template-columns:auto 1fr;column-gap:4px;align-items:end;margin-bottom:3px;">
                  <span><strong>Nombre:</strong></span>
                  <span >${UF(r.name ?? "&nbsp;", 120)}</span>
                </div>

                <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;column-gap:6px;align-items:end;margin-bottom:3px;">
                  <span><strong>Parentesco:</strong></span>
                  <span >${UF(r.relationShip ?? "&nbsp;", 80)}</span
                  <span><strong>Teléfono:</strong></span>
                  <span >${UF(r.phone ?? "&nbsp;", 80)}</span>
                </div>

                <div style="display:grid;grid-template-columns:auto 1fr;column-gap:4px;align-items:end;">
                  <span><strong>Correo:</strong></span>
                  <span >${UF(r.email ?? "&nbsp;", 120)}</span>
                </div>
              </div>
            `;
        }

        if (r.type === "LABORAL") {
          return `
              <div>
                <div style="display:grid;grid-template-columns:auto 1fr;column-gap:4px;align-items:end;margin-bottom:3px;">
                  <span><strong>Nombre:</strong></span>
                  <span >${UF(r.name ?? "&nbsp;", 120)}</span>
                </div>

                <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;column-gap:6px;align-items:end;margin-bottom:3px;">
                  <span><strong>Empresa:</strong></span>
                  <span >${UF(r.company ?? "&nbsp;", 80)}</span>
                  <span><strong>Teléfono:</strong></span>
                  <span >${UF(r.phone ?? "&nbsp;", 80)}</span>
                </div>

                <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;column-gap:6px;align-items:end;">
                  <span><strong>Correo:</strong></span>
                  <span >${UF(r.email ?? "&nbsp;", 80)}</span>
                  <span><strong>Cargo:</strong></span>
                  <span >${UF(r.position ?? "&nbsp;", 80)}</span>
                </div>
              </div>
            `;
        }

        return "";
      })
      .join("")
    }
  </div>
</div>

<!-- TEXTO LEGAL -->
<div style="font-size:11.5px;border:1px solid #ccc;padding:4px;margin-bottom:5px;line-height:1.5;text-align:justify;border-radius: 4px">
  <strong>AUTORIZACIÓN PARA CONSULTA Y REPORTE DE INFORMACIÓN: </strong>
  Dando cumplimiento a lo dispuesto en la Ley 1581 de 2012 "por la cual se dictan disposiciones generales para la protección
  de datos personales" y de conformidad con lo señalado en el Decreto 1377 de 2013, con la firma de este documento, manifiesto
  que he sido informado por ${escHtml(template.nombre.toUpperCase())}, y en ejercicio de mi Derecho a la Libertad y Autodeterminación Informática,
  autorizo a ${escHtml(template.nombre.toUpperCase())}, o a la entidad que mi acreedor delegue para representarlo o a su cesionario, endosatario o a
  quien ostente en el futuro la calidad de acreedor, previo a la relación contractual y de manera irrevocable, escrita, expresa,
  concreta, suficiente, voluntaria e informada, con la finalidad que la información comercial, crediticia, financiera y de servicios
  de la cual soy titular referida al nacimiento, ejecución y extinción de obligaciones dinerarias, a mi comportamiento e historial
  crediticio, incluida la información positiva y negativa de mis hábitos de pago, y aquella que se refiera a la información personal
  necesaria para el estudio, análisis y eventual otorgamiento de un crédito o colaboración de un contrato, sea en general
  administrada y en especial: capturada, tratada, procesada, operada, verificada, transmitida transferida, usada o puesta en
  circulación, y consultada por terceras personas autorizadas expresamente por la ley 1266 de 2008, incluyendo los Usuarios de
  la Información. Con estas mismas alcances, atributos y finalidades autorizo expresamente para que tal información sea conocida
  y reportada en la Base de Datos de DATACREDITO operada por FENALCO y DATACREDITO.
  <br/>
  Así mismo, de conformidad con la Ley 527 de 1999 y demás normas concordantes, acepto la utilización de medios electrónicos para la suscripción del presente documento y reconozco que la firma electrónica aquí incorporada tiene plena validez jurídica y los mismos efectos probatorios de una firma manuscrita. Autorizo la conservación de las evidencias electrónicas asociadas al proceso de firma, incluyendo fecha y hora de suscripción, dirección IP, mecanismos de autenticación utilizados, registros de auditoría y huella digital (hash) del documento como soporte de mi consentimiento y aceptación.
</div>

<!-- ACEPTO + ÍNDICE + FIRMA -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:5px">
  <div style="font-size:11.5px;border:1px solid #ccc;padding:5px;border-radius:4px;display:flex;flex-direction:column;min-height:105px">
    <p style="margin:0 0 5px;font-size:10px;line-height:1.35;text-align:justify;">
      <strong>
        He recibido en perfecto estado y a mi entera conformidad, los libros que describe y
        manifiesto tener conocimiento que la empresa ${escHtml(template.nombre.toUpperCase())}, por ningún motivo
        permitirá la anulación o devolución después de firmada esta LIBRANZA. Toda devolución genera
        una indemnización del 37% del valor de la misma.
      </strong>
    </p>

    <div style="margin-top:auto;">
      <div style="
        height:42px;
        border:1px dashed #777;
        border-radius:3px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#fff;
        margin-bottom:4px;
        overflow:hidden;
      ">
        ${sigZone}
      </div>

      <div style="
        font-size:8px;
        font-weight:700;
        text-align:center;
        text-transform:uppercase;
        letter-spacing:.4px;
      ">
        Acepto el Descuento y Recibo en Conformidad
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr;gap:5px">
    <div style="border:${sigBorder};padding:4px;border-radius:4px;font-size:10px">
      <strong style="font-size:10px">Aprobada la Autorización<br>para Descuento Respectivo</strong>
      <br><strong style="color:#a07830">Firma</strong>
      <div style="height:48px;margin-top:2px;display:flex;align-items:center;justify-content:center; background-color:#ccc; border-radius:3px">
      </div>
    </div>
  </div>
</div>

  <!-- CONTENEDOR TABLA -->
  <div style="position:relative;margin-bottom:3px">

    <!-- TABLA PRODUCTOS -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;border-radius:4px">
      <thead>
        <tr>
          <th style="${thStyle};width:70px">CODIGO</th>
          <th style="${thStyle};width:20px">C</th>
          <th style="${thStyle}">DESCRIPCIÓN</th>
          <th style="${thStyle};width:90px;text-align:right">VALOR</th>
        </tr>
      </thead>
      <tbody>
        ${productoRows}
        ${emptyRowsHtml}
      </tbody>
    </table>

    <!-- MARCA DE AGUA -->
    <div style="
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      font-size:18px;
      font-weight:900;
      color:#cc0000;
      letter-spacing:4px;
      opacity:0.12;
      text-transform:uppercase;
      pointer-events:none;
      white-space:nowrap;
    ">
      NO SE ACEPTAN DEVOLUCIONES
    </div>

  </div>
<!-- TOTAL -->
<div style="display:flex;justify-content:flex-end;margin-bottom:5px">
  <table style="border-collapse:collapse;font-size:12px">
    <tr>
      <td style="font-weight:700;padding:2px 10px;border:1px solid #000;background:#1a1a2e;color:white">TOTAL COMPRA</td>
      <td style="padding:2px 18px;border:1px solid #000;text-align:right;font-weight:700;min-width:90px">
        $${moneyPdf(total)}
      </td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

const thStyle = `
  background:#1c1e34;
  color:#fff;
  font-weight:600;
  padding:4px 6px;
  border:1px solid #3a3c52;
  text-align:left;
`;
const tdStyle = `
  border:1px solid #3a3c52;
  padding:3px 6px;
`;