import path from "node:path";
import { StructureAnalyzer } from "./analyzer/StructureAnalyzer.js";
import { MarkdownGenerator } from "./generator/MarkdownGenerator.js";
import { ExcelParser } from "./parser/ExcelParser.js";

export { HeadingDetector } from "./analyzer/HeadingDetector.js";
export { StructureAnalyzer } from "./analyzer/StructureAnalyzer.js";
export type { DetectedTable } from "./analyzer/TableDetector.js";
export { TableDetector } from "./analyzer/TableDetector.js";
export { MarkdownGenerator } from "./generator/MarkdownGenerator.js";
// Re-export all public types and classes
export type {
  BorderStyle,
  CellStyle,
  DocumentNode,
  HeadingNode,
  HorizontalRuleNode,
  ImageNode,
  ListItemNode,
  ListNode,
  MergeInfo,
  ParagraphNode,
  ParsedCell,
  ParsedSheet,
  SectionNode,
  TableNode,
} from "./ir/types.js";
export { ExcelParser } from "./parser/ExcelParser.js";
export { MergedCellResolver } from "./parser/MergedCellResolver.js";

export type ConvertOptions = {
  outputDir?: string;
  sheetNames?: string[];
  extractImages?: boolean;
};

/**
 * Convert an Excel houganshi file to Markdown.
 *
 * @param inputPath - Path to the .xlsx file
 * @param options   - Conversion options
 * @returns Map of sheet name → Markdown content
 */
export async function convertExcelToMarkdown(
  inputPath: string,
  options: ConvertOptions = {},
): Promise<Map<string, string>> {
  const parser = new ExcelParser();
  const analyzer = new StructureAnalyzer();
  const generator = new MarkdownGenerator();

  const sheets = await parser.parse(inputPath);
  const result = new Map<string, string>();

  for (const sheet of sheets) {
    if (options.sheetNames && !options.sheetNames.includes(sheet.name)) {
      continue;
    }

    const nodes = analyzer.analyze(sheet);
    const markdown = generator.generate(nodes);
    result.set(sheet.name, markdown);

    if (options.outputDir) {
      const sanitized = sheet.name.replace(/[/\\?%*:|"<>]/g, "_");
      const outPath = path.join(options.outputDir, `${sanitized}.md`);
      await Bun.write(outPath, markdown);
    }
  }

  return result;
}

// CLI support
if (Bun.main === import.meta.path) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun run src/index.ts <input.xlsx> [outputDir]");
    process.exit(1);
  }

  const inputPath = args[0];
  const outputDir = args[1];

  try {
    const results = await convertExcelToMarkdown(inputPath, { outputDir });
    for (const [sheetName, markdown] of results) {
      if (!outputDir) {
        console.log(`\n# Sheet: ${sheetName}\n`);
        console.log(markdown);
      } else {
        console.log(
          `Converted sheet "${sheetName}" → ${outputDir}/${sheetName}.md`,
        );
      }
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
