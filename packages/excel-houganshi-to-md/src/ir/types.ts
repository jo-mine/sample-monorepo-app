export type BorderStyle = {
  style: "thin" | "medium" | "thick" | "double" | "dotted" | "dashed" | "none";
  color?: string;
};

export type CellStyle = {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontColor?: string;
  backgroundColor?: string;
  borders: {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
  };
  alignment?: {
    horizontal?: string;
    vertical?: string;
    wrapText?: boolean;
  };
};

export type MergeInfo = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

export type ParsedCell = {
  row: number;
  col: number;
  value: string | number | boolean | null;
  formula?: string;
  merge?: MergeInfo;
  style: CellStyle;
};

export type ParsedSheet = {
  name: string;
  cells: ParsedCell[][];
  mergedCells: MergeInfo[];
  rowCount: number;
  colCount: number;
};

export type HeadingNode = {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

export type ParagraphNode = {
  type: "paragraph";
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type TableNode = {
  type: "table";
  headers: string[];
  rows: string[][];
  mergeInfo?: MergeInfo[];
};

export type ListItemNode = {
  text: string;
  children?: ListItemNode[];
};

export type ListNode = {
  type: "list";
  ordered: boolean;
  items: ListItemNode[];
};

export type ImageNode = {
  type: "image";
  alt: string;
  path: string;
};

export type SectionNode = {
  type: "section";
  title: string;
  children: DocumentNode[];
};

export type HorizontalRuleNode = {
  type: "horizontal_rule";
};

export type DocumentNode =
  | HeadingNode
  | ParagraphNode
  | TableNode
  | ListNode
  | ImageNode
  | SectionNode
  | HorizontalRuleNode;
