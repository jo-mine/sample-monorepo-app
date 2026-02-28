#!/bin/bash

set -euo pipefail

# ============================================================
# 指定シートのみを画像化するスクリプト
# 依存: python3 + openpyxl, libreoffice, imagemagick
#
# 使用方法:
#   ./sheet_to_image.sh <Excelファイル> <シート名> [出力ディレクトリ]
#
# 例:
#   ./sheet_to_image.sh report.xlsx "Sheet1"
#   ./sheet_to_image.sh report.xlsx "売上データ" ./output
# ============================================================

SCRIPT_NAME="$(basename "$0")"

usage() {
    cat <<EOF
使用方法: $SCRIPT_NAME <Excelファイル> <シート名> [出力ディレクトリ]

引数:
  Excelファイル     変換対象の .xlsx ファイル（.xls は非対応）
  シート名          画像化するシート名
  出力ディレクトリ  出力先 (省略時: カレントディレクトリ)

例:
  $SCRIPT_NAME report.xlsx Sheet1
  $SCRIPT_NAME report.xlsx "売上データ" ./output

依存ツール:
  python3 + openpyxl  : pip3 install openpyxl
  libreoffice         : apt install -y libreoffice
  imagemagick         : apt install -y imagemagick
EOF
    exit 1
}

# ============================================================
# 引数チェック
# ============================================================
[[ $# -lt 2 ]] && usage

EXCEL_FILE="$1"
SHEET_NAME="$2"
OUTPUT_DIR="${3:-.}"

if [[ ! -f "$EXCEL_FILE" ]]; then
    echo "エラー: ファイルが見つかりません: $EXCEL_FILE" >&2
    exit 1
fi

# 依存コマンド確認
for cmd in python3 libreoffice convert; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "エラー: '$cmd' がインストールされていません" >&2
        exit 1
    fi
done

# openpyxl 確認
if ! python3 -c "import openpyxl" &>/dev/null; then
    echo "エラー: openpyxl がインストールされていません" >&2
    echo "  pip3 install openpyxl" >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/extract_sheet.py"

EXCEL_ABS="$(realpath "$EXCEL_FILE")"
EXCEL_BASENAME="$(basename "$EXCEL_FILE" | sed 's/\.[^.]*$//')"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "処理開始: $EXCEL_FILE (シート: $SHEET_NAME)"

# ============================================================
# Step 1: openpyxl で指定シートのみを抽出して一時ファイルに保存
#         - グラフ・図形・ピボットテーブルは XML ごと保持される場合がありますが、
#           openpyxl の未対応機能は保持されない場合があります (特にピボットテーブル等)
# ============================================================
echo "[1/3] シート抽出中 (openpyxl)..."

python3 "$PYTHON_SCRIPT" "$EXCEL_ABS" "$SHEET_NAME" "$WORK_DIR/sheet_only.xlsx"

# ============================================================
# Step 2: LibreOffice で一時 xlsx を PDF に変換
# ============================================================
echo "[2/3] PDF変換中 (LibreOffice)..."

libreoffice \
    --headless \
    --norestore \
    --convert-to pdf \
    --outdir "$WORK_DIR" \
    "$WORK_DIR/sheet_only.xlsx" \
    > /dev/null 2>&1

PDF_FILE="$WORK_DIR/sheet_only.pdf"

if [[ ! -f "$PDF_FILE" ]]; then
    echo "エラー: PDF変換に失敗しました" >&2
    exit 1
fi

# ============================================================
# Step 3: ImageMagick で PDF を PNG に変換
# ============================================================
echo "[3/3] PNG変換中 (ImageMagick)..."

SAFE_SHEET="$(echo "$SHEET_NAME" | tr ' /\\:*?"<>|' '_')"
OUTPUT_FILE="$OUTPUT_DIR/${EXCEL_BASENAME}_${SAFE_SHEET}.png"

# PDF のページ数を取得 (ImageMagick の identify を利用)
PAGE_COUNT="$(identify -format "%n" "$PDF_FILE" 2>/dev/null || echo 1)"

if [[ "$PAGE_COUNT" -eq 1 ]]; then
    # 単一ページの場合は従来どおり 1 ファイルのみ出力
    convert \
        -density 200 \
        -trim \
        -background white \
        -alpha remove \
        -quality 95 \
        "${PDF_FILE}[0]" \
        "$OUTPUT_FILE"

    echo ""
    echo "完了: $OUTPUT_FILE"
else
    # 複数ページの場合は全ページを連番ファイルとして出力
    OUTPUT_FILE_PATTERN="$OUTPUT_DIR/${EXCEL_BASENAME}_${SAFE_SHEET}_page-%02d.png"

    convert \
        -density 200 \
        -trim \
        -background white \
        -alpha remove \
        -quality 95 \
        "$PDF_FILE" \
        "$OUTPUT_FILE_PATTERN"

    FIRST_FILE="$(printf "$OUTPUT_FILE_PATTERN" 1)"
    LAST_FILE="$(printf "$OUTPUT_FILE_PATTERN" "$PAGE_COUNT")"

    echo ""
    echo "完了: $FIRST_FILE 〜 $LAST_FILE"
fi
