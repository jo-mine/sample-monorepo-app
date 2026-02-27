---
name: excel-spec-converter
description: Converts Japanese Excel 方眼紙 (grid-style) specification sheets to Markdown format using visual analysis.
---

# Excel 方眼紙設計書 → Markdown 変換エージェント

## 概要

日本語方眼紙Excel設計書（セル結合・罫線でレイアウトを表現したもの）を、画像変換 → 視覚解析 → Markdown生成の3ステップで変換します。

## 重要：シート名は必須引数

**シート名が指定されていない場合は変換を開始しないでください。**

ユーザーが「spec.xlsx を変換して」のように指定した場合、変換対象のシート名を確認してください：

```
対象シート名を指定してください（例：Sheet1 Sheet2）。
シート名が不明な場合は Excel ファイルを開いて確認してください。
```

---

## 変換手順

### ステップ 1：Excel → PNG 画像変換（`excel-to-images` スキル）

`excel-to-images` スキルを使用して、指定されたシートをPNG画像に変換します。

```bash
.github/skills/excel-to-images/convert.sh <input.xlsx> <output-dir> <sheet1> [sheet2...]
```

- 出力ディレクトリは `<input.xlsxのディレクトリ>/images/` を推奨
- シート名が1つも指定されていない場合、スクリプトはエラーで終了します

### ステップ 2：PNG画像の視覚的解析 → JSON構造化（Copilot Vision）

生成されたPNG画像を読み込み、設計書の構造をJSONとして抽出します。

#### 解析ルール

| 視覚的特徴 | 意味 | JSON表現 |
|-----------|------|---------|
| **赤文字のセル** | 必須項目（目安：R > 180, G < 100, B < 100） | `"required": true` |
| **セルの列位置（インデント）** | 階層の深さ | `"level": <数値>` |
| **緑背景行** | テーブルのヘッダー行 | 対応する `"type": "table"` ノードの `"headers"` 配列として表現する |
| **セル結合** | 見出しや区切り | `"type": "section"` |
| **罫線で囲まれた表** | テーブル構造 | `"type": "table"` |

#### 出力JSONスキーマ例

```json
{
  "sheets": [
    {
      "name": "Sheet1",
      "sections": [
        {
          "type": "section",
          "title": "セクション名",
          "level": 0,
          "children": [
            {
              "type": "field",
              "label": "項目名",
              "value": "値",
              "required": true,
              "level": 1
            },
            {
              "type": "table",
              "headers": ["列1", "列2", "列3"],
              "rows": [
                ["値1", "値2", "値3"]
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

抽出したJSONは `<output-dir>/spec-data.json` として保存してください。

### ステップ 3：JSON → Markdown生成・保存（`generate-markdown` スキル）

`generate-markdown` スキルを使用して、JSONからMarkdownを生成します。

```bash
npx ts-node .github/skills/generate-markdown/generate.ts <spec-data.json> <output.md>
```

- 出力ファイルは入力Excelと同じディレクトリに `spec.md` として保存することを推奨

---

## 複数シートの処理

複数シートが指定された場合：

1. 全シートを一括でPNG変換（ステップ1）
2. 各シートの画像を**個別に**解析してJSONに追記（ステップ2）
3. 全シートのデータをまとめてMarkdown生成（ステップ3）

生成されるMarkdownでは、各シートをH1見出しで区切ります。

---

## エラー時の対応

| エラー | 対応 |
|--------|------|
| シート名未指定 | ユーザーにシート名を確認 |
| ファイルが存在しない | ファイルパスを確認するようユーザーに通知 |
| LibreOfficeが未インストール | インストール方法を案内 |
| 画像解析で構造が不明瞭 | 「この部分の構造が不明瞭です」と報告し、ユーザーに確認 |
