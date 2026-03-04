import * as fs from "node:fs";
import * as path from "node:path";

const DENSITY = 200;
const QUALITY = 95;

type ImageMagickKind = "magick" | "legacy";

function hasCommand(cmd: string): boolean {
  return Bun.which(cmd) !== null;
}

function runCommand(command: string[], errorMessage: string): string {
  const proc = Bun.spawnSync(command, {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.exitCode !== 0) {
    const stderr = new TextDecoder().decode(proc.stderr).trim();
    throw new Error(stderr ? `${errorMessage}: ${stderr}` : errorMessage);
  }

  return new TextDecoder().decode(proc.stdout);
}

async function runCommandAsync(
  command: string[],
  errorMessage: string,
): Promise<string> {
  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
    proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
  ]);

  if (exitCode !== 0) {
    const trimmedStderr = stderr.trim();
    throw new Error(
      trimmedStderr ? `${errorMessage}: ${trimmedStderr}` : errorMessage,
    );
  }

  return stdout;
}

function detectImageMagick(): ImageMagickKind {
  if (hasCommand("magick")) {
    return "magick";
  }
  if (hasCommand("convert") && hasCommand("identify")) {
    return "legacy";
  }

  throw new Error(
    "ImageMagick がインストールされていません。`magick` または `convert/identify` を利用可能にしてください",
  );
}

function getPdfPageCount(pdfPath: string, kind: ImageMagickKind): number {
  const output =
    kind === "magick"
      ? runCommand(
          ["magick", "identify", "-format", "%n\\n", pdfPath],
          "PDF のページ数取得に失敗しました",
        )
      : runCommand(
          ["identify", "-format", "%n\\n", pdfPath],
          "PDF のページ数取得に失敗しました",
        );

  const lines = output.trim().split("\n");
  const pageCount = Number.parseInt(lines[lines.length - 1], 10);

  if (Number.isNaN(pageCount) || pageCount < 1) {
    throw new Error("PDF のページ数を取得できませんでした");
  }

  return pageCount;
}

async function convertPageToPng(
  pdfPath: string,
  pageIndex: number,
  outputPath: string,
  kind: ImageMagickKind,
): Promise<void> {
  const commonArgs = [
    "-density",
    String(DENSITY),
    "-background",
    "white",
    "-alpha",
    "remove",
    "-quality",
    String(QUALITY),
    `${pdfPath}[${pageIndex}]`,
    outputPath,
  ];

  if (kind === "magick") {
    await runCommandAsync(
      ["magick", "convert", ...commonArgs],
      "PNG 変換に失敗しました",
    );
    return;
  }

  await runCommandAsync(["convert", ...commonArgs], "PNG 変換に失敗しました");
}

async function convertPagesInParallel(
  pdfPath: string,
  pageCount: number,
  baseName: string,
  outputDir: string,
  digits: number,
  kind: ImageMagickKind,
  concurrency: number,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, pageCount);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const pageIndex = nextIndex;
      nextIndex += 1;

      if (pageIndex >= pageCount) {
        return;
      }

      const pageLabel = String(pageIndex + 1).padStart(digits, "0");
      const outputPath = path.join(
        outputDir,
        `${baseName}_page${pageLabel}.png`,
      );

      await convertPageToPng(pdfPath, pageIndex, outputPath, kind);
      console.log(
        `  [${pageIndex + 1}/${pageCount}] ${path.basename(outputPath)}`,
      );
    }
  });

  await Promise.all(workers);
}

async function pdfToImages(pdfFile: string, outputDir?: string): Promise<void> {
  if (!fs.existsSync(pdfFile)) {
    throw new Error(`ファイルが見つかりません: ${pdfFile}`);
  }

  const pdfAbs = path.resolve(pdfFile);
  const baseName = path.basename(pdfAbs, path.extname(pdfAbs));
  const resolvedOutputDir = outputDir
    ? path.resolve(outputDir)
    : path.resolve(process.cwd(), "dist");

  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  const magickKind = detectImageMagick();
  const pageCount = getPdfPageCount(pdfAbs, magickKind);
  const digits = String(pageCount).length;
  const concurrency = Math.min(4, pageCount);

  console.log(`ページ数: ${pageCount}`);
  console.log(`並列数: ${concurrency}`);
  console.log("PNG 変換中...");

  await convertPagesInParallel(
    pdfAbs,
    pageCount,
    baseName,
    resolvedOutputDir,
    digits,
    magickKind,
    concurrency,
  );

  console.log("完了");
  console.log(`出力先: ${resolvedOutputDir}`);
}

const cmdName = path.basename(process.argv[1] || "pdf-to-images");
const [, , pdfFile, outputDir] = process.argv;

if (!pdfFile) {
  console.error(`使用方法: ${cmdName} <PDFファイル> [出力ディレクトリ]`);
  process.exit(1);
}

pdfToImages(pdfFile, outputDir).catch((error: Error) => {
  console.error("エラー:", error.message);
  process.exit(1);
});
