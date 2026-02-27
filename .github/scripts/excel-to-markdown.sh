#!/bin/bash
# Excel設計書をMarkdownに変換するスクリプト
# 使用方法: ./excel-to-markdown.sh [-s シート名 ...] <Excelファイルパス>
#
# オプション:
#   -s, --sheet <シート名>  変換対象のシートを指定する（複数指定可）
#                           省略した場合はすべてのシートを変換する
#                           ※ .xlsx ファイルのみサポート（node v22+ と exceljs が必要）
#
# 処理概要:
#   1. LibreOfficeでExcel → PDF変換
#   2. pdftoppmでPDF → PNG画像（ページ毎）変換
#   3. 生成された画像パスを標準出力に出力する
#      → エージェントが画像を視覚的に解析してMarkdownを生成する

set -euo pipefail

# ---------------------------------------------------------------------------
# 引数パース
# ---------------------------------------------------------------------------
SHEET_NAMES=()
INPUT_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -s|--sheet)
            if [[ $# -lt 2 ]]; then
                echo "エラー: -s/--sheet オプションにはシート名が必要です。" >&2
                exit 1
            fi
            SHEET_NAMES+=("$2")
            shift 2
            ;;
        -*)
            echo "エラー: 不明なオプション: $1" >&2
            echo "使用方法: $0 [-s シート名 ...] <Excelファイルパス>" >&2
            exit 1
            ;;
        *)
            if [[ -n "$INPUT_FILE" ]]; then
                echo "エラー: 入力ファイルが複数指定されています。" >&2
                exit 1
            fi
            INPUT_FILE="$1"
            shift
            ;;
    esac
done

if [[ -z "$INPUT_FILE" ]]; then
    echo "使用方法: $0 [-s シート名 ...] <Excelファイルパス>" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# 入力ファイルの存在確認
# ---------------------------------------------------------------------------
if [ ! -f "$INPUT_FILE" ]; then
    echo "エラー: ファイルが存在しません: $INPUT_FILE" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# 拡張子チェック
# ---------------------------------------------------------------------------
case "$INPUT_FILE" in
    *.xlsx|*.xls)
        ;;
    *)
        echo "エラー: サポートされていないファイル形式です（.xlsx または .xls のみ対応）: $INPUT_FILE" >&2
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# LibreOfficeの存在確認
# ---------------------------------------------------------------------------
if ! command -v libreoffice &> /dev/null; then
    echo "エラー: LibreOfficeがインストールされていません。" >&2
    echo "インストール方法（Debian/Ubuntu）: sudo apt-get install -y libreoffice" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# pdftoppmの存在確認
# ---------------------------------------------------------------------------
if ! command -v pdftoppm &> /dev/null; then
    echo "エラー: pdftoppmがインストールされていません。" >&2
    echo "インストール方法（Debian/Ubuntu）: sudo apt-get install -y poppler-utils" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# シートフィルタリング使用時の追加確認
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ${#SHEET_NAMES[@]} -gt 0 ]]; then
    case "$INPUT_FILE" in
        *.xls)
            echo "エラー: シートフィルタリングは .xlsx 形式のみサポートしています。.xlsx に変換してから再実行してください。" >&2
            exit 1
            ;;
    esac
    if ! command -v node &> /dev/null; then
        echo "エラー: シートフィルタリングには node (v22 以上) が必要です。" >&2
        exit 1
    fi
    # exceljs が未インストールの場合は自動インストール
    if [ ! -d "${SCRIPT_DIR}/node_modules/exceljs" ]; then
        echo "exceljs をインストール中..."
        if ! npm install --prefix "${SCRIPT_DIR}" --silent; then
            echo "エラー: exceljs のインストールに失敗しました。" >&2
            exit 1
        fi
    fi
fi

# ---------------------------------------------------------------------------
# プロジェクトルートを自動検出
# ---------------------------------------------------------------------------
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# ---------------------------------------------------------------------------
# 出力ディレクトリの作成
# ---------------------------------------------------------------------------
WORK_DIR="${PROJECT_ROOT}/.github/work"
mkdir -p "$WORK_DIR"

# ---------------------------------------------------------------------------
# ファイル名（拡張子なし）を取得
# ---------------------------------------------------------------------------
BASENAME="$(basename "$INPUT_FILE")"
FILENAME="${BASENAME%.*}"

PDF_OUTPUT="${WORK_DIR}/${FILENAME}.pdf"
MD_OUTPUT="${WORK_DIR}/${FILENAME}.md"
IMAGE_PREFIX="${WORK_DIR}/${FILENAME}"

# 一時ファイルの自動クリーンアップ
TEMP_XLSX=""
cleanup() {
    if [[ -n "${TEMP_XLSX}" && -f "${TEMP_XLSX}" ]]; then
        rm -f "${TEMP_XLSX}"
    fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# シートフィルタリング: 指定シートのみを含む一時 .xlsx を作成
# ---------------------------------------------------------------------------
CONVERT_FILE="$INPUT_FILE"
if [[ ${#SHEET_NAMES[@]} -gt 0 ]]; then
    TEMP_XLSX="${TMPDIR:-/tmp}/excel-to-md-$$.xlsx"
    echo "シートフィルタリング中: ${SHEET_NAMES[*]}"
    if ! node --experimental-strip-types \
            "${SCRIPT_DIR}/filter-excel-sheets.ts" \
            "$INPUT_FILE" "$TEMP_XLSX" "${SHEET_NAMES[@]}"; then
        echo "エラー: シートのフィルタリングに失敗しました。" >&2
        exit 1
    fi
    CONVERT_FILE="$TEMP_XLSX"
    echo "シートフィルタリング完了: ${SHEET_NAMES[*]}"
fi

# ---------------------------------------------------------------------------
# LibreOfficeでExcel → PDF変換
# ---------------------------------------------------------------------------
echo "ExcelファイルをPDFに変換中: $INPUT_FILE"
# LibreOffice は入力ファイル名に基づいて PDF を生成するため、
# 一時ファイルを使用した場合は生成された PDF を期待のパスにリネームする
CONVERT_PDF="${WORK_DIR}/$(basename "${CONVERT_FILE%.*}").pdf"
if ! libreoffice --headless --convert-to pdf --outdir "$WORK_DIR" "$CONVERT_FILE"; then
    echo "エラー: PDF変換に失敗しました: $INPUT_FILE" >&2
    exit 1
fi

# 変換後のPDFが存在するか確認
if [ ! -f "$CONVERT_PDF" ]; then
    echo "エラー: PDFファイルが生成されませんでした: $CONVERT_PDF" >&2
    exit 1
fi

# 一時ファイルを使用した場合は期待のパスにリネーム
if [[ "$CONVERT_PDF" != "$PDF_OUTPUT" ]]; then
    mv "$CONVERT_PDF" "$PDF_OUTPUT"
fi

echo "PDF変換完了: $PDF_OUTPUT"

# ---------------------------------------------------------------------------
# pdftoppmでPDF → PNG画像（ページ毎）変換
# 解像度150dpiで各ページをPNG画像として出力する
# ---------------------------------------------------------------------------
echo "PDFをページ画像に変換中..."
if ! pdftoppm -png -r 150 "$PDF_OUTPUT" "$IMAGE_PREFIX"; then
    echo "エラー: PDF→画像変換に失敗しました: $PDF_OUTPUT" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# 生成された画像ファイル一覧を取得して標準出力に出力する
# エージェントがこれらの画像を視覚的に解析してMarkdownを生成する
# ---------------------------------------------------------------------------
IMAGE_FILES=()
while IFS= read -r -d '' img; do
    IMAGE_FILES+=("$img")
done < <(find "$WORK_DIR" -name "${FILENAME}-*.png" -print0 | sort -z -V)

if [ ${#IMAGE_FILES[@]} -eq 0 ]; then
    echo "エラー: ページ画像が生成されませんでした。" >&2
    exit 1
fi

echo "ページ画像の生成完了: ${#IMAGE_FILES[@]}ページ"

# 出力先Markdownパスと生成画像パス一覧を標準出力に出力する
echo "MARKDOWN_OUTPUT=${MD_OUTPUT}"
for img in "${IMAGE_FILES[@]}"; do
    echo "PAGE_IMAGE=${img}"
done
