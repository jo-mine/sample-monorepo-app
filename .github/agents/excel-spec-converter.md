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
| **赤文字のセル** | 必須項目（目安：R > 180, G < 100, B < 100） | 該当行に `"required": true` |
| **セルの列位置（インデント）** | 階層の深さ | 該当行に `"level": <数値>`（0=インデントなし, 1=1段深い, ...） |
| **緑背景行** | テーブルのヘッダー行 | 対応する仕様テーブルノードの `"headers"` 配列として表現する |
| **セル結合（横）** | 見出し・区切り行 | `"type": "section"` |
| **"N.セクション名" 形式の行** | 番号付きセクション（入力仕様・出力仕様等） | `"type": "section"`, `"title": "N.セクション名"`, `"level": 1` |
| **罫線で囲まれた仕様テーブル**（No・論理名・物理名等の列構成） | 入力/出力仕様・バリデーション表 | `"type": "spec-table"` |
| **罫線で囲まれた汎用テーブル** | その他の表形式データ | `"type": "table"` |
| **テキストのみのセル行** | 処理概要などの説明文 | `"type": "text"` |

#### 方眼紙設計書の典型的なセクション構成

以下の番号付きセクションを認識してJSON化してください：

| セクション | テーブル列構成 |
|-----------|-------------|
| **N.入力仕様** | No, 論理名, 物理名, 設定値 |
| **N.出力仕様** | No, 論理名, 物理名, 設定値 |
| **N.処理概要** | テキスト（テーブルなし） |
| **N.バリデーション** | No, チェック対象, チェック内容, チェック詳細 |

#### 出力JSONスキーマ例（方眼紙設計書の典型構造）

```json
{
  "sheets": [
    {
      "name": "ユーザー一覧画面",
      "sections": [
        {
          "type": "section",
          "title": "API:ユーザーリスト取得（getUserList）",
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
                    { "cells": ["1", "検索条件", "searchCondition", ""], "required": true, "level": 0 },
                    { "cells": ["2", "ユーザーID", "user_id", ""], "level": 1 },
                    { "cells": ["3", "ユーザー名", "user_name", ""], "level": 1 },
                    { "cells": ["4", "組織キー", "organization_key", ""], "level": 1 },
                    { "cells": ["5", "ページ番号", "page_num", "デフォルト値:1"], "level": 1 }
                  ]
                }
              ]
            },
            {
              "type": "section",
              "title": "2.出力仕様",
              "level": 1,
              "children": [
                {
                  "type": "spec-table",
                  "headers": ["No", "論理名", "物理名", "設定値"],
                  "rows": [
                    { "cells": ["1", "ユーザーリスト", "userList", ""], "level": 0 },
                    { "cells": ["2", "ユーザーID", "user_id", ""], "level": 1 },
                    { "cells": ["3", "ユーザー名", "user_name", ""], "level": 1 },
                    { "cells": ["6", "ページネーター", "paginator", ""], "level": 0 },
                    { "cells": ["7", "ページ番号", "page_num", ""], "level": 1 }
                  ]
                }
              ]
            },
            {
              "type": "section",
              "title": "3.処理概要",
              "level": 1,
              "children": [
                {
                  "type": "text",
                  "content": "入力された検索条件に応じたユーザーを検索し、ユーザーリストを返却する。"
                }
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
                    { "cells": ["1", "検索条件.ユーザーID", "選択肢逸脱チェック", "ユーザーマスタに存在するユーザーIDであること"] },
                    { "cells": ["2", "検索条件.ユーザーID", "排他チェック", "ユーザーIDと組織キーは同時には設定不可能"] },
                    { "cells": ["3", "検索条件.組織キー", "選択肢逸脱チェック", "組織マスタに存在する組織キーであること"] }
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
