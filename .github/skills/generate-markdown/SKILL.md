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
          "title": "API:XXX（funcName）",
          "level": 0,
          "children": [
            {
              "type": "section",
              "title": "1.入力仕様",
              "level": 1,
              "children": [
                {
                  "type": "spec-table",
                  "headers": ["No", "論理名", "物理名", "設定値"],
                  "rows": [
                    { "cells": ["1", "必須項目", "requiredField", ""], "required": true, "level": 0 },
                    { "cells": ["2", "子項目", "childField", ""], "level": 1 }
                  ]
                }
              ]
            },
            {
              "type": "section",
              "title": "3.処理概要",
              "level": 1,
              "children": [
                { "type": "text", "content": "処理の説明テキスト" }
              ]
            },
            {
              "type": "section",
              "title": "4.バリデーション",
              "level": 1,
              "children": [
                {
                  "type": "spec-table",
                  "headers": ["No", "チェック対象", "チェック内容", "チェック詳細"],
                  "rows": [
                    { "cells": ["1", "項目.フィールド", "チェック種別", "詳細説明"] }
                  ]
                }
              ]
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
| `"spec-table"` | 方眼紙設計書の仕様テーブル（入力仕様・出力仕様・バリデーションなど）。各行に `required`/`level` メタデータを持つ |
| `"field"` | キー・バリュー形式の項目（`level` はインデント深さを制御：0=インデントなし、1=スペース2つ、以降も同様） |
| `"table"` | 汎用の表形式データ |
| `"text"` | 自由テキスト |

### `spec-table` 行のフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `cells` | `string[]` | 各列の値（ヘッダーと同数） |
| `required` | `boolean?` | 赤文字（必須）の場合 `true` |
| `level` | `number?` | 列インデント深さ（0=フラット, 1=1段深い,...) |

## 出力Markdownの規則

- 各シートは `# シート名` (H1) で始まる
- `section` の `level` に応じてH2〜H4の見出しを使用
- `spec-table` の `required: true` 行は論理名セルを `**✅ 論理名**` 形式でボールド＋アイコン表示
- `spec-table` の `level > 0` 行は論理名セルに全角スペースでインデントを付加
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

入力JSON（方眼紙設計書の入力仕様）：

```json
{
  "sheets": [{
    "name": "ユーザー一覧画面",
    "sections": [{
      "type": "section",
      "title": "API:getUserList",
      "level": 0,
      "children": [{
        "type": "section",
        "title": "1.入力仕様",
        "level": 1,
        "children": [{
          "type": "spec-table",
          "headers": ["No", "論理名", "物理名", "設定値"],
          "rows": [
            { "cells": ["1", "検索条件", "searchCondition", ""], "required": true, "level": 0 },
            { "cells": ["2", "ユーザーID", "user_id", ""], "level": 1 }
          ]
        }]
      }]
    }]
  }]
}
```

出力Markdown：

```markdown
# ユーザー一覧画面

## API:getUserList

### 1.入力仕様

| No | 論理名 | 物理名 | 設定値 |
| --- | --- | --- | --- |
| 1 | **✅ 検索条件** | searchCondition |  |
| 2 | 　ユーザーID | user_id |  |
```

## エラーケース

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Usage: ...` | 引数が2つ未満 | 引数を正しく指定 |
| `Error: Input file not found` | JSONファイルが存在しない | ファイルパスを確認 |
| `Error: Invalid JSON` | JSONが不正 | JSONの内容を確認 |
