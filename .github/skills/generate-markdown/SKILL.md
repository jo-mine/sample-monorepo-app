---
name: generate-markdown
description: Generates a Markdown file from structured JSON data extracted from a 方眼紙 Excel specification sheet. Use this after visual analysis is complete.
---

# generate-markdown スキル

視覚解析によって抽出されたJSON構造データから、Markdownファイルを生成します。

## 使用方法

```bash
npx ts-node .github/skills/generate-markdown/generate.ts <spec-data.json> <output.md>
```

## 引数仕様

| 引数 | 必須 | 説明 |
|------|------|------|
| `<spec-data.json>` | ✅ | `excel-to-images` スキルと視覚解析で生成したJSONファイルのパス |
| `<output.md>` | ✅ | 生成するMarkdownファイルの出力パス |

## 入力JSONスキーマ

```json
{
  "sheets": [
    {
      "name": "シート名",
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
              "headers": ["列1", "列2"],
              "rows": [["値1", "値2"]]
            }
          ]
        }
      ]
    }
  ]
}
```

### ノードタイプ

| `type` 値 | 説明 |
|-----------|------|
| `"section"` | セクション見出し（`level` に応じてH2〜H4） |
| `"field"` | キー・バリュー形式の項目（`level` はインデント深さを制御：0=インデントなし、1=スペース2つ、以降も同様） |
| `"table"` | 表形式データ |
| `"text"` | 自由テキスト |

## 出力Markdownの規則

- 各シートは `# シート名` (H1) で始まる
- `section` の `level` に応じてH2〜H4の見出しを使用
- `required: true` の項目は先頭に `✅` を付加
- テーブルはMarkdownテーブル記法で出力
- 複数シートは連続して1つのMarkdownファイルに出力

## 使用例

```bash
# 基本的な使い方
npx ts-node .github/skills/generate-markdown/generate.ts ./images/spec-data.json ./spec.md

# 絶対パス指定
npx ts-node .github/skills/generate-markdown/generate.ts /path/to/spec-data.json /path/to/output/spec.md
```

## 出力例

入力JSON：

```json
{
  "sheets": [{
    "name": "基本情報",
    "sections": [{
      "type": "section",
      "title": "システム概要",
      "level": 0,
      "children": [
        { "type": "field", "label": "システム名", "value": "受注管理システム", "required": true, "level": 1 },
        { "type": "field", "label": "バージョン", "value": "1.0.0", "required": false, "level": 1 }
      ]
    }]
  }]
}
```

出力Markdown：

```markdown
# 基本情報

## システム概要

  - ✅ **システム名**: 受注管理システム
  - **バージョン**: 1.0.0
```

## エラーケース

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Usage: ...` | 引数が2つ未満 | 引数を正しく指定 |
| `Error: Input file not found` | JSONファイルが存在しない | ファイルパスを確認 |
| `Error: Invalid JSON` | JSONが不正 | JSONの内容を確認 |
