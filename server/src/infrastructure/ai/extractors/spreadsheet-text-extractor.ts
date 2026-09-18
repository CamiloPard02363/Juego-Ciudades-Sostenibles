// Los tipos de exceljs declaran `export class Workbook`, pero en tiempo de
// ejecución exceljs es un módulo CJS (`module.exports = { Workbook, ... }`)
// que Node no analiza como export nombrado real — `import { Workbook }`
// compila pero revienta al arrancar. El import por namespace sí funciona
// porque toma el objeto completo de exports, sin depender de esa detección.
import * as ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

/** Vuelca un Excel (.xlsx) a texto tabular simple (una línea por fila, celdas separadas por " | "). */
export async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  // exceljs declara su propio `Buffer` ambiental (choca con el de @types/node)
  // y por eso el Buffer real de Node no encaja estructuralmente en su tipo.
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    lines.push(`# Hoja: ${sheet.name}`);
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map((cell) => String(cell ?? '').trim());
      lines.push(cells.join(' | '));
    });
  });

  return lines.join('\n');
}

/** Vuelca un CSV a texto tabular simple (una línea por fila, celdas separadas por " | "). */
export function extractCsvText(buffer: Buffer): string {
  const rows = parse(buffer, { skip_empty_lines: true }) as string[][];
  return rows.map((row) => row.join(' | ')).join('\n');
}
