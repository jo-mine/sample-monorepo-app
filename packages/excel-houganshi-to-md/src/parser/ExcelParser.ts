import ExcelJS from "exceljs";
import type {
  BorderStyle,
  CellStyle,
  MergeInfo,
  ParsedCell,
  ParsedSheet,
} from "../ir/types.js";

function toColorHex(argb: string | undefined): string | undefined {
  if (!argb) return undefined;
  // ExcelJS colors are ARGB hex strings like "FF112233"
  if (argb.length === 8) return `#${argb.slice(2)}`;
  if (argb.startsWith("#")) return argb;
  return `#${argb}`;
}

function toBorderStyle(
  border: ExcelJS.Border | undefined,
): BorderStyle | undefined {
  if (!border || !border.style) return { style: "none" };
  const style = border.style as BorderStyle["style"];
  return {
    style,
    color: toColorHex((border.color as { argb?: string } | undefined)?.argb),
  };
}

function extractCellValue(
  cell: ExcelJS.Cell,
): string | number | boolean | null {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return v;
  // Date
  if (v instanceof Date) return v.toISOString();
  // RichText
  if (typeof v === "object" && "richText" in v) {
    return (v as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join("");
  }
  // Formula
  if (typeof v === "object" && "formula" in v) {
    const fv = v as ExcelJS.CellFormulaValue;
    const result = fv.result;
    if (result === null || result === undefined) return null;
    if (typeof result === "number" || typeof result === "boolean")
      return result;
    if (typeof result === "string") return result;
    if (result instanceof Date) return result.toISOString();
    return String(result);
  }
  // Hyperlink
  if (typeof v === "object" && "hyperlink" in v) {
    return (v as ExcelJS.CellHyperlinkValue).text ?? null;
  }
  return String(v);
}

function parseMergeAddress(address: string): MergeInfo | null {
  // address like "A1:C3"
  const parts = address.split(":");
  if (parts.length !== 2) return null;
  const start = parseAddress(parts[0]);
  const end = parseAddress(parts[1]);
  if (!start || !end) return null;
  return {
    startRow: start.row,
    startCol: start.col,
    endRow: end.row,
    endCol: end.col,
  };
}

function parseAddress(addr: string): { row: number; col: number } | null {
  const m = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const col = m[1]
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
  return { row: Number.parseInt(m[2], 10), col };
}

async function parseWorksheet(
  worksheet: ExcelJS.Worksheet,
): Promise<ParsedSheet> {
  const mergedCells: MergeInfo[] = [];

  // Access merged cell ranges via the worksheet model
  const model = worksheet.model as { merges?: string[] };
  if (model.merges) {
    for (const merge of model.merges) {
      const info = parseMergeAddress(merge);
      if (info) mergedCells.push(info);
    }
  }

  const cells: ParsedCell[][] = [];
  let rowCount = 0;
  let colCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > rowCount) rowCount = rowNumber;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber > colCount) colCount = colNumber;
      const style: CellStyle = {
        fontSize: (cell.font?.size as number | undefined) ?? undefined,
        bold: cell.font?.bold ?? undefined,
        italic: cell.font?.italic ?? undefined,
        underline: cell.font?.underline ? true : undefined,
        fontColor: toColorHex(
          (cell.font?.color as { argb?: string } | undefined)?.argb,
        ),
        backgroundColor: toColorHex(
          (
            (cell.fill as ExcelJS.FillPattern | undefined)?.fgColor as
              | { argb?: string }
              | undefined
          )?.argb,
        ),
        borders: {
          top: toBorderStyle(cell.border?.top),
          bottom: toBorderStyle(cell.border?.bottom),
          left: toBorderStyle(cell.border?.left),
          right: toBorderStyle(cell.border?.right),
        },
        alignment: cell.alignment
          ? {
              horizontal: cell.alignment.horizontal,
              vertical: cell.alignment.vertical,
              wrapText: cell.alignment.wrapText,
            }
          : undefined,
      };

      // Find merge info for this cell
      const merge = mergedCells.find(
        (m) =>
          rowNumber >= m.startRow &&
          rowNumber <= m.endRow &&
          colNumber >= m.startCol &&
          colNumber <= m.endCol,
      );

      const parsedCell: ParsedCell = {
        row: rowNumber,
        col: colNumber,
        value: extractCellValue(cell),
        style,
        ...(merge ? { merge } : {}),
        ...(cell.formula ? { formula: cell.formula } : {}),
      };

      if (!cells[rowNumber - 1]) cells[rowNumber - 1] = [];
      cells[rowNumber - 1][colNumber - 1] = parsedCell;
    });
  });

  return {
    name: worksheet.name,
    cells,
    mergedCells,
    rowCount,
    colCount,
  };
}

export class ExcelParser {
  async parse(filePath: string): Promise<ParsedSheet[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return this.parseWorkbook(workbook);
  }

  async parseBuffer(buffer: Buffer): Promise<ParsedSheet[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return this.parseWorkbook(workbook);
  }

  private async parseWorkbook(
    workbook: ExcelJS.Workbook,
  ): Promise<ParsedSheet[]> {
    const sheets: ParsedSheet[] = [];
    for (const worksheet of workbook.worksheets) {
      sheets.push(await parseWorksheet(worksheet));
    }
    return sheets;
  }
}
