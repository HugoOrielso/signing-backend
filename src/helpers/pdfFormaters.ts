export const F = (v?: string | null) => v?.trim() ? escHtml(v.trim()) : "&nbsp;";
export const FM = (v?: string | null) => {
  if (!v?.trim()) return "$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? escHtml(v) : `$${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
};

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function U(content: string, minWidth = 80): string {
  return `<span style="border-bottom:1px solid #555;padding:0 2px;vertical-align:bottom; display: "block">${content}</span>`;
}

export function UF(content: string, minWidth = 80): string {
  return `<span style="border-bottom:1px solid #555;padding:0 2px;vertical-align:bottom;display:block;width:100%;min-width:${minWidth}px;box-sizing:border-box;">${content}</span>`;
}
export function Box(content: string, minWidth = 70): string {
  return `<span style="border:1px solid #000;padding:0 2px;vertical-align:bottom">${content}</span>`;
}
export function Chk(on: boolean): string {
  return `<span style="display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:middle;background:${on ? "#000" : "transparent"};margin-right:3px"></span>`;
}