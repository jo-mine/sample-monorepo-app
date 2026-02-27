#!/usr/bin/env ts-node
/**
 * generate.ts
 * spec-data.json（方眼紙Excel設計書の視覚解析結果）からMarkdownファイルを生成する
 *
 * 使用方法:
 *   npx ts-node .github/skills/generate-markdown/generate.ts <spec-data.json> <output.md>
 */

import * as fs from "fs";
import * as path from "path";

// ===== 型定義 =====

interface FieldNode {
  type: "field";
  label: string;
  value: string;
  required?: boolean;
  level?: number;
}

interface TableNode {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface TextNode {
  type: "text";
  content: string;
}

interface SectionNode {
  type: "section";
  title: string;
  level?: number;
  children?: ContentNode[];
}

type ContentNode = FieldNode | TableNode | TextNode | SectionNode;

interface Sheet {
  name: string;
  sections: ContentNode[];
}

interface SpecData {
  sheets: Sheet[];
}

// ===== Markdown生成関数 =====

/**
 * セクションレベルに対応するMarkdown見出しを返す
 * level 0 → H2, level 1 → H3, level 2以上 → H4
 */
function headingForLevel(level: number): string {
  if (level <= 0) return "##";
  if (level === 1) return "###";
  return "####";
}

/**
 * コンテンツノードをMarkdown文字列に変換する
 */
function renderNode(node: ContentNode): string {
  switch (node.type) {
    case "section": {
      const headingLevel = node.level ?? 0;
      const heading = headingForLevel(headingLevel);
      const lines: string[] = [`${heading} ${node.title}`, ""];
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          lines.push(renderNode(child));
        }
        lines.push("");
      }
      return lines.join("\n");
    }

    case "field": {
      const prefix = node.required ? "✅ " : "";
      const indentStr = "  ".repeat(node.level ?? 0);
      return `${indentStr}- ${prefix}**${node.label}**: ${node.value}`;
    }

    case "table": {
      const headers = node.headers;
      const rows = node.rows;
      if (!headers || headers.length === 0 || !rows || rows.length === 0) {
        return "";
      }

      const columnCount = headers.length;

      // 行の列数をヘッダーに合わせて正規化
      const normalizedRows = rows
        .filter((row) => Array.isArray(row) && row.length > 0)
        .map((row) => {
          const truncated = row.slice(0, columnCount);
          if (truncated.length < columnCount) {
            return truncated.concat(Array(columnCount - truncated.length).fill(""));
          }
          return truncated;
        });

      if (normalizedRows.length === 0) {
        return "";
      }

      const separator = Array(columnCount).fill("---").join(" | ");
      const headerRow = headers.join(" | ");
      const rowLines = normalizedRows.map((row) => row.join(" | "));

      return [
        `| ${headerRow} |`,
        `| ${separator} |`,
        ...rowLines.map((r) => `| ${r} |`),
      ].join("\n");
    }

    case "text": {
      return node.content;
    }

    default:
      return "";
  }
}

/**
 * シートデータをMarkdown文字列に変換する
 */
function renderSheet(sheet: Sheet): string {
  const lines: string[] = [`# ${sheet.name}`, ""];
  for (const section of sheet.sections) {
    lines.push(renderNode(section));
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * SpecDataオブジェクト全体をMarkdown文字列に変換する
 */
function renderSpecData(data: SpecData): string {
  return data.sheets.map(renderSheet).join("\n---\n\n");
}

// ===== メイン処理 =====

function main(): void {
  const args = process.argv.slice(2);

  // 引数バリデーション
  if (args.length < 2) {
    console.error(
      "Usage: npx ts-node .github/skills/generate-markdown/generate.ts <spec-data.json> <output.md>",
    );
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  // 入力ファイルの存在確認
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // JSONの読み込みとパース
  let specData: SpecData;
  try {
    const raw = fs.readFileSync(inputPath, "utf-8");
    specData = JSON.parse(raw) as SpecData;
  } catch (err) {
    console.error(`Error: Invalid JSON in ${inputPath}: ${(err as Error).message}`);
    process.exit(1);
  }

  // sheetsフィールドの検証
  if (!specData.sheets || !Array.isArray(specData.sheets)) {
    console.error('Error: Invalid JSON structure. Expected a "sheets" array.');
    process.exit(1);
  }
  if (specData.sheets.length === 0) {
    console.error('Error: Invalid JSON structure. "sheets" array must contain at least one sheet.');
    process.exit(1);
  }

  // Markdown生成
  const markdown = renderSpecData(specData);

  // 出力ディレクトリを作成（存在しない場合）
  const outputDir = path.dirname(outputPath);
  if (outputDir && outputDir !== ".") {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Markdownファイルへの書き込み
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`Markdown generated: ${outputPath}`);
}

main();
