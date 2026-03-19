// src/lib/libranzaHtml.ts
// Genera el HTML de la libranza idéntico al preview del frontend
// Este HTML es el que Puppeteer convierte a PDF

interface ProductoItem {
  codigo: string;
  descripcion: string;
  valor: string;
}

interface LibranzaData {
  ciudad?: string | null;
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
  sumaTotal?: string | null;
  numeroCuotas?: string | null;
  valorCuota?: string | null;
  mesCobro?: string | null;
  tipoCuenta?: string | null;
  numeroCuenta?: string | null;
  banco?: string | null;
  productos?: ProductoItem[] | null;
  formaPago?: string | null;
}

interface SignatureData {
  type: "DRAWN" | "TYPED" | "CLICK_TO_SIGN";
  imageUrl?: string | null;
  typedValue?: string | null;
  signedAt?: string | null;
  signerName?: string;
}

const F  = (v?: string | null) => v?.trim() ? escHtml(v.trim()) : "&nbsp;";
const FM = (v?: string | null) => {
  if (!v?.trim()) return "$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? escHtml(v) : `$${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
};

function escHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function U(content: string, minWidth = 80): string {
  return `<span style="border-bottom:1px solid #000;display:inline-block;min-width:${minWidth}px;padding:0 2px;line-height:1.3;vertical-align:bottom">${content}</span>`;
}
function Box(content: string, minWidth = 70): string {
  return `<span style="border:1px solid #000;display:inline-block;padding:0 3px;min-width:${minWidth}px;line-height:1.4;vertical-align:bottom">${content}</span>`;
}
function Chk(on: boolean): string {
  return `<span style="display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:middle;background:${on ? "#000" : "transparent"};margin-right:3px"></span>`;
}

export function generateLibranzaHtml(
  d: LibranzaData,
  signature?: SignatureData,
  logoBase64?: string,
  logoMime = "image/webp"
): string {
  const total = (d.productos ?? []).reduce(
    (s, p) => s + (parseFloat(p.valor?.replace(/[^0-9.]/g, "") || "0") || 0), 0
  );

  const formaPagos = ["NOMINA", "EFECTY 110520", "PSE", "BANCO"];

  // Fecha split
  const fechaParts = d.fecha?.split("/") ?? ["", "", ""];

  // Firma en la zona
  let sigZone = "";
  if (signature) {
    if (signature.type === "DRAWN" && signature.imageUrl) {
      sigZone = `<img src="${signature.imageUrl}" style="max-height:44px;max-width:100%;object-fit:contain" alt="firma">`;
    } else if (signature.type === "TYPED" && signature.typedValue) {
      sigZone = `<span style="font-family:'Dancing Script',cursive;font-size:22px;color:#1a1a2e">${escHtml(signature.typedValue)}</span>`;
    }
  } else {
    sigZone = `<span style="font-size:6.5px;color:#d4c9b0;letter-spacing:1px">PENDIENTE DE FIRMA</span>`;
  }

  const sigBorder = signature ? "2px solid #2d6a4f" : "2px solid #c9a84c";

  // Tabla productos
  const productoRows = (d.productos ?? []).map(p => `
    <tr>
      <td style="${tdStyle}">${escHtml(p.codigo || "")}</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}">${escHtml(p.descripcion || "")}</td>
      <td style="${tdStyle};text-align:right">${p.valor ? `$${parseFloat(p.valor.replace(/[^0-9.]/g,"")).toLocaleString("es-CO",{minimumFractionDigits:2})}` : ""}</td>
    </tr>`).join("");

  const emptyRows = Math.max(0, 6 - (d.productos?.length ?? 0));
  const emptyRowsHtml = Array.from({ length: emptyRows }).map(() => `
    <tr>
      <td style="${tdStyle}">&nbsp;</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}"></td>
    </tr>`).join("");

  const logoHtml = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" style="height:52px;width:auto" alt="Dimcultura">`
    : `<div style="width:60px;height:52px;border:1px solid #000;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#1a1a2e">D</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #000; background: white; padding: 12px 16px; line-height: 1.45; }
  @page { size: A4; margin: 0; }
  @media print { body { padding: 8px 12px; } }
</style>
</head>
<body>

<!-- HEADER -->
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:5px">
  <div style="flex-shrink:0">${logoHtml}</div>

  <div style="text-align:center;flex:1;margin:0 8px">
    <div style="font-size:10px;font-weight:700">Nueva Dimensión Cultural</div>
    <div style="font-size:14px;font-weight:900">Dimcultura S.A.S</div>
    <div style="font-size:8px;font-style:italic">"Un mundo en el que debes estar"</div>
    <div style="font-size:7px;margin-top:1px">Nit. 900.585.322-4 · Tel. 310 207 98 00 / 311 861 01 61</div>
  </div>

  <div style="font-size:8px;border:1px solid #000;padding:4px 7px;min-width:155px">
    <div style="display:flex;gap:4px;margin-bottom:3px">
      <span style="font-weight:700;white-space:nowrap">CIUDAD:</span>
      <span style="border-bottom:1px solid #000;flex:1">${F(d.ciudad)}</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:3px">
      <span style="font-weight:700;white-space:nowrap">ASESOR:</span>
      <span style="border-bottom:1px solid #000;flex:1">${F(d.asesor)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:2px">
      <span style="font-size:7px">DD</span>
      <span style="border:1px solid #000;min-width:16px;text-align:center;padding:0 1px">${escHtml(fechaParts[0] || "")}</span>
      <span style="font-size:7px">MM</span>
      <span style="border:1px solid #000;min-width:16px;text-align:center;padding:0 1px">${escHtml(fechaParts[1] || "")}</span>
      <span style="font-size:7px">AA</span>
      <span style="border:1px solid #000;min-width:26px;text-align:center;padding:0 1px">${escHtml((fechaParts[2] || "").slice(-2))}</span>
      <span style="font-weight:700;font-size:9px;margin-left:3px">LIBRANZA</span>
    </div>
  </div>
</div>

<!-- SEDE -->
<div style="text-align:center;font-size:7px;margin-bottom:5px;border-bottom:1px solid #ccc;padding-bottom:3px">
  Sede Administrativa: Calle 24 No. 5-40 Conjunto los Ángeles Barrio Gran Colombia Casa G1
  Villa del Rosario Col. Lote 1 Barrio el Country Tel. 6512857 &nbsp;
  <strong>servicioalcliente@dimcultura.com · www.dimcultura.com</strong>
</div>

<!-- CUERPO -->
<div style="font-size:9px;line-height:1.65;margin-bottom:5px">
  Yo ${U(F(d.clienteNombre), 130)}
  con C.C.${U(F(d.clienteCC), 90)}
  De ${U(F(d.clienteCCDe), 90)},<br>
  residente en ${U(F(d.clienteDireccion), 150)}
  con número de contacto ${U(F(d.clienteTelefono), 90)} y correo<br>
  de notificación ${U(F(d.clienteEmail), 130)}
  Funcionario de ${U(F(d.clienteFuncionario), 110)}
  Desde hace ${U(F(d.clienteDesdeHace), 70)}<br>
  Actualmente trabajo en el municipio de ${U(F(d.municipioTrabajo), 110)},
  me permito autorizar por medio de este, al Señor pagador de<br>
  ${U(F(d.empresaTrabajo), 160)},
  departamento ${U(F(d.departamento), 100)},
  para que descuente de mi sueldo o de cualquier otro concepto la<br>
  suma de ${Box(FM(d.sumaTotal), 90)}
  en ${Box(F(d.numeroCuotas), 30)}
  cuotas mensuales consecutivas por valor de ${Box(FM(d.valorCuota), 90)}, cada una, a partir<br>
  del mes de ${Box(F(d.mesCobro), 110)}
  y pagarlos a la orden de <strong>DIMCULTURA S.A.S.</strong>
  <span style="font-size:8px"> Nota: en caso de que el cupo de mi nómina no sea suficiente para cubrir la obligación mensual, autorizo a la empresa para que debite los valores pactados en este documento, de mi cuenta</span><br>
  <strong>Ahorros</strong> ${Chk(d.tipoCuenta === "Ahorros")}
  <strong>Corriente</strong> ${Chk(d.tipoCuenta === "Corriente")}
  No. ${U(F(d.numeroCuenta), 100)}
  DEL BANCO ${U(F(d.banco), 100)}
  <span style="font-size:7px"> Declaro formalmente no tener nada que reclamar a <strong>DIMCULTURA S.A.S</strong> judicial o extrajudicialmente, por los cargos que a través de la presente autorización, se realice de mi cuenta.</span>
</div>

<!-- REFERIDOS -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #000;padding:5px;margin-bottom:5px;font-size:8px">
  <div>
    <strong>Nombre: </strong>${U("&nbsp;", 120)}<br>
    <strong>Parentesco: </strong>${U("&nbsp;", 70)} <strong>Teléfono: </strong>${U("&nbsp;", 70)}<br>
    <strong>Correo: </strong>${U("&nbsp;", 140)}
  </div>
  <div>
    <strong>Nombre: </strong>${U("&nbsp;", 120)}<br>
    <strong>Parentesco: </strong>${U("&nbsp;", 70)} <strong>Teléfono: </strong>${U("&nbsp;", 70)}<br>
    <strong>Correo: </strong>${U("&nbsp;", 140)}
  </div>
</div>

<!-- TEXTO LEGAL -->
<div style="font-size:6.5px;border:1px solid #ccc;padding:5px;margin-bottom:5px;line-height:1.5;text-align:justify">
  <strong>AUTORIZACIÓN PARA CONSULTA Y REPORTE DE INFORMACIÓN: </strong>
  Dando cumplimiento a lo dispuesto en la Ley 1581 de 2012 "por la cual se dictan disposiciones generales para la protección
  de datos personales" y de conformidad con lo señalado en el Decreto 1377 de 2013, con la firma de este documento, manifiesto
  que he sido informado por DIMCULTURA S.A.S., y en ejercicio de mi Derecho a la Libertad y Autodeterminación Informática,
  autorizo a DIMCULTURA S.A.S., o a la entidad que mi acreedor delegue para representarlo o a su cesionario, endosatario o a
  quien ostente en el futuro la calidad de acreedor, previo a la relación contractual y de manera irrevocable, escrita, expresa,
  concreta, suficiente, voluntaria e informada, con la finalidad que la información comercial, crediticia, financiera y de servicios
  de la cual soy titular referida al nacimiento, ejecución y extinción de obligaciones dinerarias, a mi comportamiento e historial
  crediticio, incluida la información positiva y negativa de mis hábitos de pago, y aquella que se refiera a la información personal
  necesaria para el estudio, análisis y eventual otorgamiento de un crédito o colaboración de un contrato, sea en general
  administrada y en especial: capturada, tratada, procesada, operada, verificada, transmitida transferida, usada o puesta en
  circulación, y consultada por terceras personas autorizadas expresamente por la ley 1266 de 2008, incluyendo los Usuarios de
  la Información. Con estas mismas alcances, atributos y finalidades autorizo expresamente para que tal información sea conocida
  y reportada en la Base de Datos de DATACREDITO operada por FENALCO y DATACREDITO.
</div>

<!-- ACEPTO + ÍNDICE + FIRMA -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:5px">
  <div style="font-size:7.5px;border:1px solid #ccc;padding:5px">
    <p style="margin:0 0 5px;font-size:7px;line-height:1.4">
      <strong>He recibo en perfecto estado y a mi entera conformidad, los libros que describe y
      manifestado tener conocimiento que la empresa DIMCULTURA S.A.S., por ningún motivo
      permitirá la anulación o devolución después de firmada esta LIBRANZA, sin embargo torna
      la responsabilidad de que toda devolución que gote una devolución una indemnización
      del 37% del valor de la misma.</strong>
    </p>
    <strong>Acepto el Descuento y Recibo en Conformidad</strong>
    <div style="border-bottom:1px solid #000;margin-top:22px;margin-bottom:3px"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
    <div style="border:1px solid #ccc;padding:5px;font-size:7.5px">
      <strong>Índice Derecho</strong>
      <div style="height:44px;border:1px dashed #bbb;margin-top:4px;border-radius:2px"></div>
    </div>
    <div style="border:${sigBorder};padding:5px;border-radius:4px;font-size:7.5px">
      <strong style="font-size:7px">Aprobada la Autorización<br>para Descuento Respectivo</strong>
      <br><strong style="color:#a07830">Firma</strong>
      <div style="height:48px;margin-top:2px;display:flex;align-items:center;justify-content:center">
        ${sigZone}
      </div>
      ${signature?.signedAt ? `<div style="font-size:6px;color:#7a6e5f;text-align:center;margin-top:2px">${new Date(signature.signedAt).toLocaleDateString("es-CO")}</div>` : ""}
    </div>
  </div>
</div>

<!-- TABLA PRODUCTOS -->
<table style="width:100%;border-collapse:collapse;margin-bottom:3px;font-size:8px">
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

<!-- Sello -->
<div style="text-align:center;font-size:13px;font-weight:900;color:#cc0000;letter-spacing:4px;margin:2px 0;opacity:0.1;text-transform:uppercase;pointer-events:none">
  NO SON DEVOLUCIONES
</div>

<!-- TOTAL -->
<div style="display:flex;justify-content:flex-end;margin-bottom:5px">
  <table style="border-collapse:collapse;font-size:9px">
    <tr>
      <td style="font-weight:700;padding:2px 10px;border:1px solid #000;background:#1a1a2e;color:white">TOTAL COMPRA</td>
      <td style="padding:2px 18px;border:1px solid #000;text-align:right;font-weight:700;min-width:90px">
        $${total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
      </td>
    </tr>
  </table>
</div>

<!-- FORMA DE PAGO -->
<div style="display:flex;align-items:center;gap:12px;font-size:8px;border:1px solid #000;padding:4px 8px;margin-bottom:5px">
  <strong>FORMA DE PAGO:</strong>
  ${formaPagos.map(op => `
    <span style="display:flex;align-items:center;gap:3px">
      ${Chk(d.formaPago === op)}${escHtml(op)}
    </span>`).join("")}
</div>

<!-- BLOQUE ACEPTADA -->
<div style="border:1px solid #000;padding:5px 7px;font-size:8px">
  <div style="display:flex;gap:10px;margin-bottom:4px;flex-wrap:wrap">
    <strong>ACEPTADA</strong>
    <span>Fecha: ${U("&nbsp;", 80)}</span>
    <span>N°: ${U("&nbsp;", 60)}</span>
    <span>Por $: ${U("&nbsp;", 70)}</span>
  </div>
  <div style="margin-bottom:3px">
    <strong>Señor(es): </strong>${U("&nbsp;", 150)}
    El ${U("&nbsp;", 50)} de ${U("&nbsp;", 80)} del año ${U("&nbsp;", 50)}
  </div>
  <div style="margin-bottom:3px">
    Se servirán(n) ud.(es) pagar solidariamente en ${U("&nbsp;", 140)}
    por esta Única de Cambio sin protesto, excusado al aviso de rechazo a
  </div>
  <div style="margin-bottom:3px">la orden de ${U("&nbsp;", 200)}</div>
  <div style="margin-bottom:3px">La cantidad de: ${U("&nbsp;", 140)} ($${U("&nbsp;", 80)})</div>
  <div style="margin-bottom:3px">
    Pesos m/l en ${U("&nbsp;", 50)} Cuota(s) de $ ${U("&nbsp;", 70)}
    más intereses durante el plazo de ${U("&nbsp;", 60)} meses y del mora a la tasa máxima legal autorizada.
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:8px;padding-top:4px;border-top:1px solid #ccc;font-size:7.5px">
    <div>
      <div style="border-bottom:1px solid #000;height:22px;margin-bottom:3px"></div>
      <div><strong>Firma</strong></div>
      <div>Cédula NIT.</div><div>Ciudad NIT.</div>
    </div>
    <div>
      <div style="border-bottom:1px solid #000;height:22px;margin-bottom:3px"></div>
      <div><strong>Firma</strong></div>
      <div>Cédula NIT.</div><div>Ciudad NIT.</div>
    </div>
    <div style="grid-column:span 2">
      <div style="margin-bottom:2px"><strong>DIRECCIÓN ACEPTANTES</strong></div>
      ${U("&nbsp;", 200)}
      <div style="margin-top:3px"><strong>TELÉFONO: </strong>${U("&nbsp;", 80)} <strong>Atentamente,</strong></div>
    </div>
  </div>
</div>

</body>
</html>`;
}

const thStyle = "padding:3px 6px;border:1px solid #000;font-weight:700;font-size:8px;text-align:left;background:#1a1a2e;color:white";
const tdStyle = "padding:3px 6px;border:1px solid #ddd;font-size:8px;height:18px";