---
name: excel-to-png
description: ExcelファイルをPNGファイルに変換する
argument-hint: 変換対象のExcelファイルのパスを提供してください。
user-invokable: false
---

# Excel to PNG スキル

このスキルは `excel-to-images` バイナリを使用して、ExcelファイルをPNGに変換します。

## 入力

- 変換対象のExcelファイルパス（`.xlsx` / `.xls` など）

## 実行手順

1. 変換対象ファイルの存在を確認する。
2. 以下のコマンドで変換する。

```bash
cd ./github/skills/excel-to-png
./excel-to-images {変換対象のexcelファイルのパス}
```

## 出力

- 期待される出力ファイル: `./dist/{変換対象のexcelファイル名}_page{連番}.png`
- 例: `Book.xlsx` の場合は `./dist/Book_page1.png`, `./dist/Book_page2.png` のようにページごとに出力される
- 1ページのみのExcelでも、出力ファイル名は `..._page1.png` 形式になる

## 実行ルール

- コマンドは必ずワークスペースルートで実行する。
- 出力はカレントディレクトリ配下の `dist` を利用する。
- 失敗時はエラーメッセージをそのまま返し、入力パス誤り・依存コマンド不足を優先的に確認する。
