import type { ParsedCell, ParsedSheet } from "../ir/types.js";

export class MergedCellResolver {
  resolve(sheet: ParsedSheet): ParsedCell[][] {
    const { cells, mergedCells, rowCount, colCount } = sheet;

    // Build a map from "row,col" to the top-left cell of the merge
    const mergeTopLeft = new Map<string, ParsedCell | null>();

    for (const merge of mergedCells) {
      const topLeftCell = this.getCell(cells, merge.startRow, merge.startCol);
      for (let r = merge.startRow; r <= merge.endRow; r++) {
        for (let c = merge.startCol; c <= merge.endCol; c++) {
          const key = `${r},${c}`;
          if (r === merge.startRow && c === merge.startCol) {
            mergeTopLeft.set(key, topLeftCell ?? null);
          } else {
            // Non-top-left cells in a merge are marked as null (visited)
            mergeTopLeft.set(key, null);
          }
        }
      }
    }

    const grid: ParsedCell[][] = [];

    for (let r = 1; r <= rowCount; r++) {
      const row: ParsedCell[] = [];
      for (let c = 1; c <= colCount; c++) {
        const key = `${r},${c}`;
        if (mergeTopLeft.has(key)) {
          const cell = mergeTopLeft.get(key);
          if (cell !== null && cell !== undefined) {
            row.push(cell);
          }
          // null means it's a non-top-left merged cell, skip it
        } else {
          const cell = this.getCell(cells, r, c);
          if (cell) {
            row.push(cell);
          }
        }
      }
      grid.push(row);
    }

    return grid;
  }

  private getCell(
    cells: ParsedCell[][],
    row: number,
    col: number,
  ): ParsedCell | undefined {
    return cells[row - 1]?.[col - 1];
  }
}
