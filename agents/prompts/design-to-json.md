# 設計書画像→JSON変換プロンプト

## 概要

設計書の画像ファイルを入力として受け取り、所定のJSON仕様に基づいた構造化データを出力するためのプロンプトです。

## 入力

- 設計書の画像ファイル（画面設計書、API設計書、IF設計書など）

## 前提条件

- 画像内に記載された情報を正確に読み取ること
- 物理名が記載されていない場合は論理名から推定すること
- 日本語の設計書を想定

## 出力JSON仕様

[agents/schemas/layout.schema.json](../schemas/layout.schema.json) を参照してください。

## 抽出対象

### メタ情報（meta）
- 機能名（function_name）
- アプリケーション名（application）
- モジュール名（module）
- 作成日時（created_at）
- 更新日時（updated_at）

### 定義情報（definitions）
設計書内の各エンドポイント/アクションごとに以下を抽出:

- **種類（type）**: API呼び出し → `"api"` / 画面操作 → `"action"`
- **論理名（name）**: 日本語の名称
- **物理名（action）**: 英語の関数名/アクション名（camelCase）
- **入力仕様（inputLayoutSpec）**: リクエストパラメータ/入力項目
- **出力仕様（outputLayoutSpec）**: レスポンスデータ/出力項目
- **バリデーション（validations）**: 入力チェックルール

### レイアウト仕様の構造

各項目は以下の2種類に分類:

1. **Leaf（末端項目）**: `logical_name` + `notes`
2. **Branch（階層項目）**: `logical_name` + `notes` + `properties`（子項目を再帰的に含む）

### バリデーションルール

| 項目 | 説明 |
|---|---|
| `target_logical_name` | 対象項目の論理名パス（例: `検索条件.ユーザーID`） |
| `validation_type` | チェック種類（必須、形式、選択肢逸脱、排他、桁数など） |
| `validation_details` | チェックの詳細説明 |

## 出力例

[agents/examples/sample-output.json](../examples/sample-output.json) を参照してください。
