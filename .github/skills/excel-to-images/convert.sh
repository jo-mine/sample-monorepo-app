#!/usr/bin/env bash
# Excel（.xlsx）ファイルを指定シートのPNG画像に変換するLibreOffice CLIラッパー
# 使用方法: convert.sh <input.xlsx> <output-dir> <sheet1> [sheet2...]

set -euo pipefail

# ===== 引数バリデーション =====

# 引数が3つ未満の場合はエラー（ファイル、出力ディレクトリ、シート名が揃っていない）
if [ $# -lt 3 ]; then
  echo "Usage: $0 <input.xlsx> <output-dir> <sheet1> [sheet2...]" >&2
  echo "Error: At least one sheet name must be specified." >&2
  exit 1
fi

INPUT_PATH="$1"
OUTPUT_DIR="$2"
shift 2
SHEETS=("$@")

# シート名に制御文字が含まれていないか検証
for sheet in "${SHEETS[@]}"; do
  if printf '%s' "$sheet" | grep -qP '[\x00-\x1f\x7f]'; then
    echo "Error: Sheet name contains control characters: $(printf '%s' "$sheet" | cat -v)" >&2
    exit 1
  fi
done

# 入力ファイルが存在しない場合はエラー
if [ ! -f "$INPUT_PATH" ]; then
  echo "Error: Input file not found: $INPUT_PATH" >&2
  exit 1
fi

# LibreOfficeがインストールされていない場合はエラー
if ! command -v libreoffice &>/dev/null; then
  echo "Error: libreoffice is not installed. Please install LibreOffice." >&2
  echo "  Ubuntu/Debian: sudo apt-get install libreoffice" >&2
  exit 1
fi

# jqがインストールされていない場合はエラー
if ! command -v jq &>/dev/null; then
  echo "Error: jq is not installed. Please install jq." >&2
  echo "  Ubuntu/Debian: sudo apt-get install jq" >&2
  exit 1
fi

# ===== 変換処理 =====

# 出力ディレクトリを作成（存在しない場合）
mkdir -p "$OUTPUT_DIR"

# 入力ファイルの絶対パスを取得
INPUT_ABS="$(realpath "$INPUT_PATH")"
OUTPUT_ABS="$(realpath "$OUTPUT_DIR")"

# ファイル名（拡張子なし）を取得
BASENAME="$(basename "$INPUT_ABS" .xlsx)"

# Step 1: LibreOffice CLI で Excel → PDF 変換
echo "Converting Excel to PDF: $INPUT_ABS" >&2
libreoffice --headless --convert-to pdf --outdir "$OUTPUT_ABS" "$INPUT_ABS" >&2

PDF_PATH="$OUTPUT_ABS/${BASENAME}.pdf"

# PDFが生成されているか確認
if [ ! -f "$PDF_PATH" ]; then
  echo "Error: PDF conversion failed. Expected output: $PDF_PATH" >&2
  exit 1
fi

# Step 2: LibreOffice CLI で PDF → PNG 変換
echo "Converting PDF to PNG: $PDF_PATH" >&2
libreoffice --headless --convert-to png --outdir "$OUTPUT_ABS" "$PDF_PATH" >&2

# Step 3: 生成されたPNGファイルの一覧を収集（maxdepth 1 で直下のみ）
mapfile -t IMAGE_PATHS < <(find "$OUTPUT_ABS" -maxdepth 1 -name "*.png" | sort)

# PNGが1つも生成されていない場合はエラー
if [ ${#IMAGE_PATHS[@]} -eq 0 ]; then
  echo "Error: PNG conversion produced no output files in: $OUTPUT_ABS" >&2
  exit 1
fi

# ===== JSON出力 =====
# 結果をJSONとして標準出力（Copilot Agentが読み取る）

# シート名の配列をJSON配列に変換
SHEETS_JSON="$(printf '%s\n' "${SHEETS[@]}" | jq -R . | jq -s .)"

# 画像パスの配列をJSON配列に変換
IMAGES_JSON="$(printf '%s\n' "${IMAGE_PATHS[@]}" | jq -R . | jq -s .)"

# 最終的なJSON出力
jq -n \
  --arg outputDir "$OUTPUT_ABS" \
  --argjson sheets "$SHEETS_JSON" \
  --argjson images "$IMAGES_JSON" \
  '{outputDir: $outputDir, sheets: $sheets, images: $images}'
