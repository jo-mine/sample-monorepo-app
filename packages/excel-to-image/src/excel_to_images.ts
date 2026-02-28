import { execSync, execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ============================================================
// Excelファイル全体を各シート別に画像化するスクリプト
// 依存: libreoffice, imagemagick (convert / identify)
//
//   # 開発時 (Bun で直接実行)
//   bun run excel_to_images.ts <Excelファイル> [出力ディレクトリ]
//
//   # bun build --compile でビルドした実行ファイルを使う場合
//   #   例: bun build excel_to_images.ts --compile --outfile excel_to_images
//   ./excel_to_images <Excelファイル> [出力ディレクトリ]
//
// 例:
//   bun run excel_to_images.ts report.xlsx
//   bun run excel_to_images.ts report.xlsx ./output
// ============================================================

const DENSITY = 200; // 解像度 (dpi)
const QUALITY = 95; // PNG品質

function checkCommand(cmd: string): void {
    try {
        execSync(`command -v ${cmd}`, { stdio: "ignore" });
    } catch {
        throw new Error(
            `'${cmd}' がインストールされていません。\n  apt install -y libreoffice imagemagick`
        );
    }
}

/** LibreOffice でExcelファイル全体をPDFに変換する */
function convertToPdf(excelAbs: string, workDir: string): string {
    execFileSync(
        "libreoffice",
        [
            "--headless",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            workDir,
            excelAbs,
        ],
        { stdio: "ignore" }
    );

    const baseName = path.basename(excelAbs, path.extname(excelAbs));
    const pdfPath = path.join(workDir, `${baseName}.pdf`);

    if (!fs.existsSync(pdfPath)) {
        throw new Error("PDF変換に失敗しました");
    }
    return pdfPath;
}

/** ImageMagick の identify でPDFの総ページ数を取得する */
function getPdfPageCount(pdfPath: string): number {
    const result = execFileSync("identify", ["-format", "%n\n", pdfPath], {
        encoding: "utf8",
    });
    // identify は各ページにつき1行出力するため、最後の行の値を使用
    const lines = result.trim().split("\n");
    const count = Number.parseInt(lines[lines.length - 1], 10);
    if (Number.isNaN(count) || count < 1) {
        throw new Error("PDFのページ数を取得できませんでした");
    }
    return count;
}

/** PDFの各ページをPNGに変換して出力ディレクトリに保存する */
function convertPagesToImages(
    pdfPath: string,
    pageCount: number,
    baseName: string,
    outputDir: string
): string[] {
    const outputFiles: string[] = [];
    const digits = String(pageCount).length; // ページ数に合わせてゼロ埋め桁数を決定

    for (let i = 0; i < pageCount; i++) {
        const pageLabel = String(i + 1).padStart(digits, "0");
        const outputFile = path.join(outputDir, `${baseName}_page${pageLabel}.png`);

        execFileSync("convert", [
            "-density",
            String(DENSITY),
            "-trim",
            "-background",
            "white",
            "-alpha",
            "remove",
            "-quality",
            String(QUALITY),
            `${pdfPath}[${i}]`,
            outputFile,
        ]);

        outputFiles.push(outputFile);
        console.log(`  [${i + 1}/${pageCount}] ${path.basename(outputFile)}`);
    }

    return outputFiles;
}

async function excelToImages(
    excelFile: string,
    outputDir: string = "./dist"
): Promise<void> {
    // ファイル存在確認
    if (!fs.existsSync(excelFile)) {
        throw new Error(`ファイルが見つかりません: ${excelFile}`);
    }

    // 依存コマンド確認
    for (const cmd of ["libreoffice", "convert", "identify"]) {
        checkCommand(cmd);
    }

    fs.mkdirSync(outputDir, { recursive: true });

    const excelAbs = path.resolve(excelFile);
    const baseName = path.basename(excelFile, path.extname(excelFile));
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel2img-"));

    try {
        // Step 1: LibreOffice でExcel全体をPDF化
        console.log("[1/3] PDF変換中 (LibreOffice)...");
        const pdfPath = convertToPdf(excelAbs, workDir);

        // Step 2: PDFのページ数を取得
        console.log("[2/3] ページ数確認中...");
        const pageCount = getPdfPageCount(pdfPath);
        console.log(`  総ページ数: ${pageCount}`);

        // Step 3: 各ページをPNGに変換
        console.log("[3/3] PNG変換中 (ImageMagick)...");
        const outputFiles = convertPagesToImages(pdfPath, pageCount, baseName, outputDir);

        console.log("");
        console.log("完了!");
        console.log(`  出力ファイル数: ${outputFiles.length}`);
        console.log(`  出力ディレクトリ: ${path.resolve(outputDir)}`);
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

// ============================================================
// CLI エントリポイント
// ============================================================
const cmdName = path.basename(process.argv[1] || "excel-to-images");
const [, , excelFile, outputDir] = process.argv;
if (!excelFile) {
    console.error(
        `使用方法: ${cmdName} <Excelファイル> [出力ディレクトリ]`
    );
    process.exit(1);
}

excelToImages(excelFile, outputDir).catch((e: Error) => {
    console.error("エラー:", e.message);
    process.exit(1);
});
