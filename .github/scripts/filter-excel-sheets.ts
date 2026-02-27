/**
 * filter-excel-sheets.ts
 * 指定されたシートのみを含む新しい .xlsx ファイルを生成する
 *
 * 使用方法: node --experimental-strip-types filter-excel-sheets.ts <src> <dst> <sheet1> [sheet2 ...]
 */

import ExcelJS from "exceljs";
import { argv, exit, stderr } from "node:process";

const [, , srcPath, dstPath, ...targets] = argv;

if (!srcPath || !dstPath || targets.length === 0) {
  stderr.write(
    "使用方法: filter-excel-sheets.ts <入力ファイル> <出力ファイル> <シート名> [...]\n",
  );
  exit(1);
}

const srcWorkbook = new ExcelJS.Workbook();
await srcWorkbook.xlsx.readFile(srcPath);

const available = srcWorkbook.worksheets.map((ws) => ws.name);
const missing = targets.filter((t) => !available.includes(t));

if (missing.length > 0) {
  stderr.write(
    `エラー: 指定されたシートが見つかりません: ${missing.join(", ")}\n`,
  );
  stderr.write(`利用可能なシート: ${available.join(", ")}\n`);
  exit(1);
}

const dstWorkbook = new ExcelJS.Workbook();

for (const name of targets) {
  const srcSheet = srcWorkbook.getWorksheet(name);
  if (!srcSheet) continue; // validated above; guard for type safety
  const dstSheet = dstWorkbook.addWorksheet(name, {
    properties: srcSheet.properties,
    pageSetup: srcSheet.pageSetup,
  });

  // 列幅をコピー
  srcSheet.columns.forEach((col, i) => {
    const dstCol = dstSheet.getColumn(i + 1);
    dstCol.width = col.width;
    dstCol.hidden = col.hidden;
  });

  // 行・セルをコピー
  srcSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const dstRow = dstSheet.getRow(rowNumber);
    dstRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const dstCell = dstRow.getCell(colNumber);
      dstCell.value = cell.value;
      dstCell.style = { ...cell.style };
    });
    dstRow.commit();
  });

  // 結合セルの範囲をコピー
  // ExcelJS の公開 API では結合範囲の一覧取得が提供されていないため、
  // 内部モデルの merges プロパティを使用する（ExcelJS の内部構造変更に注意）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcModel = (srcSheet as any).model;
  if (srcModel && Array.isArray(srcModel.merges)) {
    for (const mergeRange of srcModel.merges as string[]) {
      try {
        dstSheet.mergeCells(mergeRange);
      } catch (err) {
        stderr.write(
          `警告: 結合セル "${mergeRange}" のコピーに失敗しました: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
  }
}

await dstWorkbook.xlsx.writeFile(dstPath);
