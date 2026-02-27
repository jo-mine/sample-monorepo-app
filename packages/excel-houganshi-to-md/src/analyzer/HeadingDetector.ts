import type { HeadingNode, ParsedCell } from "../ir/types.js";

export class HeadingDetector {
  private baseFontSize: number;

  constructor(baseFontSize = 11) {
    this.baseFontSize = baseFontSize;
  }

  detect(cell: ParsedCell): HeadingNode | null {
    const text = cell.value != null ? String(cell.value) : "";
    if (!text.trim()) return null;

    const fontSize = cell.style.fontSize ?? this.baseFontSize;
    const bold = cell.style.bold ?? false;
    const hasBackground = !!(
      cell.style.backgroundColor && cell.style.backgroundColor !== "#FFFFFF"
    );

    let level: 1 | 2 | 3 | 4 | 5 | 6 | null = null;

    if (fontSize >= 20) {
      level = 1;
    } else if (fontSize >= 16) {
      level = 2;
    } else if (fontSize >= 14 && bold) {
      level = 2;
    } else if (fontSize >= 14) {
      level = 3;
    } else if (fontSize >= 12 && bold && hasBackground) {
      level = 3;
    } else if (fontSize >= 12 && bold) {
      level = 4;
    } else if (bold && hasBackground) {
      level = 4;
    } else if (bold) {
      level = 5;
    }

    if (level === null) return null;

    return { type: "heading", level, text };
  }
}
