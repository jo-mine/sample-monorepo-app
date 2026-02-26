#!/bin/bash
# Excel設計書をMarkdownに変換するスクリプト
# 使用方法: excel-to-markdown.sh <Excelファイルのパス>

set -euo pipefail

# -------------------------------------------------------
# 引数チェック
# -------------------------------------------------------
if [ $# -ne 1 ]; then
    echo "使用方法: $0 <Excelファイルのパス>" >&2
    exit 1
fi

INPUT_FILE="$1"

# -------------------------------------------------------
# 入力ファイルの存在確認
# -------------------------------------------------------
if [ ! -f "$INPUT_FILE" ]; then
    echo "エラー: ファイルが見つかりません: $INPUT_FILE" >&2
    exit 1
fi

# -------------------------------------------------------
# 拡張子チェック（.xlsx または .xls のみ受け付ける）
# -------------------------------------------------------
EXT="${INPUT_FILE##*.}"
if [[ "$EXT" != "xlsx" && "$EXT" != "xls" ]]; then
    echo "エラー: サポートされていないファイル形式です（.xlsx または .xls を指定してください）: $INPUT_FILE" >&2
    exit 1
fi

# -------------------------------------------------------
# 依存コマンドの確認
# -------------------------------------------------------
if ! command -v libreoffice &>/dev/null; then
    echo "エラー: libreoffice がインストールされていません。" >&2
    echo "インストール例: sudo apt-get install libreoffice" >&2
    exit 1
fi

if ! command -v pdftotext &>/dev/null; then
    echo "エラー: pdftotext がインストールされていません（poppler-utils が必要です）。" >&2
    echo "インストール例: sudo apt-get install poppler-utils" >&2
    exit 1
fi

# -------------------------------------------------------
# プロジェクトルートの自動検出
# -------------------------------------------------------
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# -------------------------------------------------------
# 出力ディレクトリの準備
# -------------------------------------------------------
WORK_DIR="${PROJECT_ROOT}/.github/work"
mkdir -p "$WORK_DIR"

# -------------------------------------------------------
# ファイル名（拡張子なし）を取得
# -------------------------------------------------------
BASENAME="$(basename "$INPUT_FILE")"
FILENAME_NO_EXT="${BASENAME%.*}"

PDF_OUTPUT="${WORK_DIR}/${FILENAME_NO_EXT}.pdf"
MD_OUTPUT="${WORK_DIR}/${FILENAME_NO_EXT}.md"

# -------------------------------------------------------
# Excel → PDF 変換
# -------------------------------------------------------
echo "ExcelファイルをPDFに変換しています: $INPUT_FILE"
if ! libreoffice --headless --convert-to pdf --outdir "$WORK_DIR" "$INPUT_FILE"; then
    echo "エラー: LibreOfficeによるPDF変換に失敗しました。" >&2
    exit 1
fi

if [ ! -f "$PDF_OUTPUT" ]; then
    echo "エラー: PDF変換後のファイルが見つかりません: $PDF_OUTPUT" >&2
    exit 1
fi

echo "PDF変換完了: $PDF_OUTPUT"

# -------------------------------------------------------
# PDF → テキスト抽出
# -------------------------------------------------------
TEMP_TEXT="$(mktemp)"
trap 'rm -f "$TEMP_TEXT"' EXIT

echo "PDFからテキストを抽出しています..."
if ! pdftotext -layout "$PDF_OUTPUT" "$TEMP_TEXT"; then
    echo "エラー: PDFからのテキスト抽出に失敗しました。" >&2
    exit 1
fi

# -------------------------------------------------------
# テキスト → Markdown 変換
# -------------------------------------------------------
echo "Markdownに変換しています..."

python3 - "$TEMP_TEXT" "$MD_OUTPUT" <<'PYTHON_SCRIPT'
import sys
import re

input_path = sys.argv[1]
output_path = sys.argv[2]

with open(input_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

md_lines = []
i = 0

def is_table_row(line):
    """スペースまたはタブで区切られた複数列を持つ行を表の行と判定する"""
    stripped = line.strip()
    if not stripped:
        return False
    # 2つ以上の連続スペースで区切られた値が3列以上ある場合を表と判定
    cols = re.split(r'  +|\t', stripped)
    return len(cols) >= 3

def looks_like_heading(line):
    """見出し候補の行を判定する"""
    stripped = line.strip()
    if not stripped:
        return False
    # 短い行（40文字以下）かつ英数字・日本語のみで構成される場合
    if len(stripped) <= 40 and re.match(r'^[A-Z0-9\u3000-\u9FFF\u30A0-\u30FF\uFF00-\uFFEF\s]+$', stripped):
        return True
    return False

def convert_bullet(line):
    """箇条書き記号を Markdown の `-` に変換する"""
    stripped = line.strip()
    # ・ や • で始まる行
    if re.match(r'^[・•]\s*', stripped):
        return "- " + re.sub(r'^[・•]\s*', '', stripped)
    # 番号付きリスト（例: 1. 2. ①②）
    if re.match(r'^(\d+[.)）]|[①-⑳])\s*', stripped):
        return "- " + re.sub(r'^(\d+[.)）]|[①-⑳])\s*', '', stripped)
    return None

def should_continue_table(lines, line_index):
    """表の読み取りを継続すべきか判定するヘルパー関数"""
    if line_index >= len(lines):
        return False
    current = lines[line_index]
    if is_table_row(current):
        return True
    # 空行の次が表行であれば継続する
    return current.strip() == "" and line_index + 1 < len(lines) and is_table_row(lines[line_index + 1])


PAGE_BREAK = '\x0c'

while i < len(lines):
    raw = lines[i]

    # ページ区切り
    if PAGE_BREAK in raw:
        md_lines.append("\n---\n")
        i += 1
        continue

    line = raw.rstrip('\n')

    # 空行
    if not line.strip():
        md_lines.append("")
        i += 1
        continue

    # 表の検出：連続する表行をまとめてMarkdownテーブルに変換
    if is_table_row(line):
        table_rows = []
        while i < len(lines) and should_continue_table(lines, i):
            if lines[i].strip():
                cols = re.split(r'  +|\t', lines[i].strip())
                table_rows.append(cols)
            i += 1
        if table_rows:
            # 列数を最大列数に統一
            max_cols = max(len(r) for r in table_rows)
            for row in table_rows:
                while len(row) < max_cols:
                    row.append("")
            # ヘッダー行
            md_lines.append("| " + " | ".join(table_rows[0]) + " |")
            md_lines.append("| " + " | ".join(["---"] * max_cols) + " |")
            for row in table_rows[1:]:
                md_lines.append("| " + " | ".join(row) + " |")
            md_lines.append("")
        continue

    # 箇条書きの変換
    bullet = convert_bullet(line)
    if bullet is not None:
        md_lines.append(bullet)
        i += 1
        continue

    # 見出し候補の変換
    if looks_like_heading(line):
        md_lines.append("## " + line.strip())
        i += 1
        continue

    # 通常のテキスト行
    md_lines.append(line.strip())
    i += 1

with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines) + "\n")

print(f"Markdown出力完了: {output_path}")
PYTHON_SCRIPT

echo "変換完了: $MD_OUTPUT"
