// Utilidad compartida para obtener URL CSV desde un Google Sheet
// Soporta enlaces con /edit, /pubhtml o ya con output=csv.
export function toCsvUrlFromGoogleSheet(sheetUrl: string): string {
  const url = sheetUrl.trim();

  // Caso: enlace de edición
  if (url.includes("/edit")) {
    const [base] = url.split("/edit");
    return `${base}/export?format=csv`;
  }

  // Caso: enlace publicado como HTML
  if (url.includes("/pubhtml")) {
    const [base, query] = url.split("?");
    const pubBase = base.replace("/pubhtml", "/pub");
    return query ? `${pubBase}?output=csv&${query}` : `${pubBase}?output=csv`;
  }

  // Si ya tiene output=csv o formato csv, respetar
  if (url.includes("output=csv") || url.endsWith(".csv")) {
    return url;
  }

  // Fallback: agregar output=csv
  return url.includes("?") ? `${url}&output=csv` : `${url}?output=csv`;
}
