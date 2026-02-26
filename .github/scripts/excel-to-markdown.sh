#!/bin/bash
# Excel設計書をMarkdownに変換するスクリプト
# 使用方法: ./excel-to-markdown.sh <Excelファイルパス>

set -euo pipefail

# ---------------------------------------------------------------------------
# 引数チェック
# ---------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    echo "使用方法: $0 <Excelファイルパス>" >&2
    exit 1
fi

INPUT_FILE="$1"

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
# pdftotextの存在確認
# ---------------------------------------------------------------------------
if ! command -v pdftotext &> /dev/null; then
    echo "エラー: pdftotextがインストールされていません。" >&2
    echo "インストール方法（Debian/Ubuntu）: sudo apt-get install -y poppler-utils" >&2
    exit 1
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

# ---------------------------------------------------------------------------
# LibreOfficeでExcel → PDF変換
# ---------------------------------------------------------------------------
echo "ExcelファイルをPDFに変換中: $INPUT_FILE"
if ! libreoffice --headless --convert-to pdf --outdir "$WORK_DIR" "$INPUT_FILE"; then
    echo "エラー: PDF変換に失敗しました: $INPUT_FILE" >&2
    exit 1
fi

# 変換後のPDFが存在するか確認
if [ ! -f "$PDF_OUTPUT" ]; then
    echo "エラー: PDFファイルが生成されませんでした: $PDF_OUTPUT" >&2
    exit 1
fi

echo "PDF変換完了: $PDF_OUTPUT"

# ---------------------------------------------------------------------------
# pdftotextでPDF → テキスト抽出
# ---------------------------------------------------------------------------
echo "PDFからテキストを抽出中..."
if ! RAW_TEXT="$(pdftotext -layout "$PDF_OUTPUT" -)"; then
    echo "エラー: PDFからのテキスト抽出に失敗しました: $PDF_OUTPUT" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# テキスト → Markdown変換
# ---------------------------------------------------------------------------
echo "Markdownに変換中..."

convert_to_markdown() {
    local text="$1"

    # awk で行ごとに処理しMarkdownへ整形する
    echo "$text" | awk '
    BEGIN {
        in_table = 0
        table_lines[0] = ""
        table_count = 0
    }

    # 改ページ（^L）は水平線に変換
    /\f/ {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        print "\n---\n"
        next
    }

    # 空行の処理
    /^[[:space:]]*$/ {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        print ""
        next
    }

    # タブ区切りの行はテーブル候補
    /\t/ {
        table_lines[table_count++] = $0
        in_table = 1
        next
    }

    # 大文字のみ（または短い行）は見出しと推定
    /^[[:upper:][:space:][:punct:][:digit:]]+$/ && length($0) < 60 && $0 ~ /[[:upper:]]/ {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        gsub(/^[[:space:]]+|[[:space:]]+$/, "")
        if (length($0) > 0) {
            print "## " $0
        }
        next
    }

    # 箇条書き（・、●、○、*、- で始まる行）
    /^[[:space:]]*[・●○\*\-]/ {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        gsub(/^[[:space:]]*[・●○\*\-][[:space:]]*/, "")
        print "- " $0
        next
    }

    # 番号付きリスト（数字. または 数字）で始まる行
    /^[[:space:]]*[0-9]+[\.\)][[:space:]]/ {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        print $0
        next
    }

    # その他の行はそのまま出力
    {
        if (in_table) {
            flush_table()
            in_table = 0
            table_count = 0
        }
        print $0
    }

    END {
        if (in_table) {
            flush_table()
        }
    }

    # テーブル行をMarkdownテーブルとして出力する関数
    function flush_table(    i, j, cols, ncols, sep, row) {
        if (table_count == 0) return

        for (i = 0; i < table_count; i++) {
            row = table_lines[i]
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", row)
            ncols = split(row, cols, /\t/)
            printf "|"
            for (j = 1; j <= ncols; j++) {
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", cols[j])
                printf " %s |", cols[j]
            }
            print ""
            # ヘッダー行の直後にセパレータを挿入
            if (i == 0) {
                printf "|"
                for (j = 1; j <= ncols; j++) {
                    printf " --- |"
                }
                print ""
            }
        }
        # テーブル配列をリセット
        for (k = 0; k < table_count; k++) {
            delete table_lines[k]
        }
        table_count = 0
    }
    '
}

MARKDOWN_CONTENT="$(convert_to_markdown "$RAW_TEXT")"

# ---------------------------------------------------------------------------
# Markdownファイルに書き出し
# ---------------------------------------------------------------------------
{
    echo "# ${FILENAME}"
    echo ""
    echo "$MARKDOWN_CONTENT"
} > "$MD_OUTPUT"

echo "Markdown変換完了: $MD_OUTPUT"
echo "$MD_OUTPUT"
