import type {
  MergeInfo,
  ParsedCell,
  ParsedSheet,
  TableNode,
} from "../ir/types.js";

export type DetectedTable = {
  startRow: number;
  startCol: number;
  rows: number;
  cols: number;
  cells: ParsedCell[][];
};

function hasBorder(cell: ParsedCell): boolean {
  const b = cell.style.borders;
  return !!(
    (b.top && b.top.style !== "none") ||
    (b.bottom && b.bottom.style !== "none") ||
    (b.left && b.left.style !== "none") ||
    (b.right && b.right.style !== "none")
  );
}

export class TableDetector {
  detect(sheet: ParsedSheet): DetectedTable[] {
    const { cells, rowCount, colCount } = sheet;

    const visited = Array.from({ length: rowCount + 1 }, () =>
      new Array(colCount + 1).fill(false),
    );

    const tables: DetectedTable[] = [];

    for (let r = 1; r <= rowCount; r++) {
      for (let c = 1; c <= colCount; c++) {
        if (visited[r][c]) continue;
        const cell = cells[r - 1]?.[c - 1];
        if (!cell || !hasBorder(cell)) continue;

        // Flood fill to find connected bordered region
        const region = this.floodFill(cells, rowCount, colCount, r, c, visited);
        if (!region) continue;

        const { minRow, maxRow, minCol, maxCol } = region;
        const rows = maxRow - minRow + 1;
        const cols = maxCol - minCol + 1;

        // Only consider multi-row AND multi-col regions as tables
        if (rows <= 1 || cols <= 1) continue;

        const tableCells: ParsedCell[][] = [];
        for (let tr = minRow; tr <= maxRow; tr++) {
          const tableRow: ParsedCell[] = [];
          for (let tc = minCol; tc <= maxCol; tc++) {
            const tableCell = cells[tr - 1]?.[tc - 1];
            tableRow.push(
              tableCell ?? {
                row: tr,
                col: tc,
                value: null,
                style: { borders: {} },
              },
            );
          }
          tableCells.push(tableRow);
        }

        tables.push({
          startRow: minRow,
          startCol: minCol,
          rows,
          cols,
          cells: tableCells,
        });
      }
    }

    return tables;
  }

  private floodFill(
    cells: ParsedCell[][],
    rowCount: number,
    colCount: number,
    startRow: number,
    startCol: number,
    visited: boolean[][],
  ): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
    const queue: [number, number][] = [[startRow, startCol]];
    let minRow = startRow;
    let maxRow = startRow;
    let minCol = startCol;
    let maxCol = startCol;

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [r, c] = item;

      if (r < 1 || r > rowCount || c < 1 || c > colCount) continue;
      if (visited[r][c]) continue;

      const cell = cells[r - 1]?.[c - 1];
      if (!cell || !hasBorder(cell)) continue;

      visited[r][c] = true;
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;

      queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    if (
      minRow === startRow &&
      maxRow === startRow &&
      minCol === startCol &&
      maxCol === startCol
    ) {
      return null;
    }

    return { minRow, maxRow, minCol, maxCol };
  }

  toTableNode(table: DetectedTable): TableNode {
    const { cells } = table;
    if (cells.length === 0) {
      return { type: "table", headers: [], rows: [] };
    }

    const firstRow = cells[0];
    const isHeaderRow = firstRow.some(
      (cell) =>
        cell.style.bold ||
        (cell.style.backgroundColor &&
          cell.style.backgroundColor !== "#FFFFFF"),
    );

    let headers: string[];
    let dataRows: ParsedCell[][];

    if (isHeaderRow) {
      headers = firstRow.map((cell) =>
        cell.value != null ? String(cell.value) : "",
      );
      dataRows = cells.slice(1);
    } else {
      headers = firstRow.map((_, i) => `Column ${i + 1}`);
      dataRows = cells;
    }

    const rows = dataRows.map((row) =>
      row.map((cell) => (cell.value != null ? String(cell.value) : "")),
    );

    const mergeInfo: MergeInfo[] = [];
    for (const row of cells) {
      for (const cell of row) {
        if (cell.merge) mergeInfo.push(cell.merge);
      }
    }

    return {
      type: "table",
      headers,
      rows,
      ...(mergeInfo.length > 0 ? { mergeInfo } : {}),
    };
  }
}
