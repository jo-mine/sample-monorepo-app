import type { DocumentNode, ParsedSheet } from "../ir/types.js";
import { MergedCellResolver } from "../parser/MergedCellResolver.js";
import { HeadingDetector } from "./HeadingDetector.js";
import { TableDetector } from "./TableDetector.js";

export class StructureAnalyzer {
  private headingDetector: HeadingDetector;
  private tableDetector: TableDetector;
  private mergedCellResolver: MergedCellResolver;

  constructor(baseFontSize = 11) {
    this.headingDetector = new HeadingDetector(baseFontSize);
    this.tableDetector = new TableDetector();
    this.mergedCellResolver = new MergedCellResolver();
  }

  analyze(sheet: ParsedSheet): DocumentNode[] {
    const nodes: DocumentNode[] = [];

    // Step 1: Detect table regions
    const detectedTables = this.tableDetector.detect(sheet);

    // Build a set of cell coordinates belonging to tables
    const tableCellKeys = new Set<string>();
    for (const table of detectedTables) {
      for (let r = table.startRow; r < table.startRow + table.rows; r++) {
        for (let c = table.startCol; c < table.startCol + table.cols; c++) {
          tableCellKeys.add(`${r},${c}`);
        }
      }
    }

    // Step 2: Resolve merged cells
    const grid = this.mergedCellResolver.resolve(sheet);

    // Step 3: Process non-table cells
    for (const row of grid) {
      for (const cell of row) {
        const key = `${cell.row},${cell.col}`;
        if (tableCellKeys.has(key)) continue;
        if (cell.value == null) continue;

        const text = String(cell.value).trim();
        if (!text) continue;

        const heading = this.headingDetector.detect(cell);
        if (heading) {
          nodes.push(heading);
        } else {
          nodes.push({
            type: "paragraph",
            text,
            ...(cell.style.bold ? { bold: true } : {}),
            ...(cell.style.italic ? { italic: true } : {}),
          });
        }
      }
    }

    // Step 4: Append table nodes
    for (const table of detectedTables) {
      nodes.push(this.tableDetector.toTableNode(table));
    }

    return nodes;
  }
}
