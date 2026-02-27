---
name: excel-to-images
description: Converts specified sheets of an Excel (.xlsx) file to PNG images using LibreOffice CLI. Sheet names are required. Use this skill when you need to visually analyze an Excel file.
---

# excel-to-images スキル

LibreOffice CLI を使用して、Excelファイルの指定シートをPNG画像に変換します。

## 使用方法

```bash
.github/skills/excel-to-images/convert.sh <input.xlsx> <output-dir> <sheet1> [sheet2...]
```

## 引数仕様

| 引数 | 必須 | 説明 |
|------|------|------|
| `<input.xlsx>` | ✅ | 変換対象のExcelファイルパス |
| `<output-dir>` | ✅ | PNG画像の出力ディレクトリパス |
| `<sheet1>` | ✅ | 変換するシート名（1つ以上必須） |
| `[sheet2...]` | ☐ | 追加のシート名（複数指定可） |

**⚠️ シート名が1つも指定されていない場合はエラーになります。**

## 出力形式

変換が成功すると、以下の形式のJSONを標準出力に出力します：

```json
{
  "outputDir": "/path/to/output",
  "sheets": ["Sheet1", "Sheet2"],
  "images": [
    "/path/to/output/spec.png"
  ]
}
```

- `outputDir`: 出力ディレクトリの絶対パス
- `sheets`: 変換対象として指定されたシート名のリスト
- `images`: 生成されたPNGファイルの絶対パスのリスト

## 変換の仕組み

1. LibreOffice CLI で Excel → PDF 変換
2. LibreOffice CLI で PDF → PNG 変換（ページごとにPNGが生成されます）

## 事前要件

以下のツールがインストールされている必要があります：

- **LibreOffice**（`libreoffice` コマンドが利用可能であること）
- **jq**（JSON出力生成に使用）

### LibreOffice のインストール（Ubuntu/Debian）

```bash
sudo apt-get install libreoffice
```

### jq のインストール（Ubuntu/Debian）

```bash
sudo apt-get install jq
```

## 使用例

```bash
# Sheet1 のみ変換
.github/skills/excel-to-images/convert.sh spec.xlsx ./images Sheet1

# Sheet1 と Sheet2 を変換
.github/skills/excel-to-images/convert.sh spec.xlsx ./images Sheet1 Sheet2

# 複数シートを変換（絶対パス指定）
.github/skills/excel-to-images/convert.sh /path/to/spec.xlsx /path/to/output Sheet1 Sheet2 Sheet3
```

## エラーケース

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Usage: ...` | 引数が3つ未満 | 引数を正しく指定 |
| `Error: At least one sheet name must be specified.` | シート名が未指定 | シート名を1つ以上指定 |
| `Error: Input file not found` | ファイルが存在しない | ファイルパスを確認 |
| `Error: libreoffice is not installed` | LibreOffice未インストール | LibreOfficeをインストール |
| `Error: jq is not installed` | jq未インストール | jqをインストール |
