# Excel設計書 → Markdown 変換エージェントスキル

## 概要

このスキルは、Excel設計書（`.xlsx` / `.xls`）をMarkdown形式に変換します。
コンテキストとして渡されたExcelファイルを受け取り、LibreOfficeを使用してPDFに変換した後、
PDFのテキスト内容を解析してMarkdownファイルとして出力します。

## 入力

- **Excelファイル**: `.xlsx` または `.xls` 形式の設計書ファイル（コンテキストとして受け取る）

## 前提条件

- **LibreOffice** がインストールされていること（`libreoffice` コマンドが実行可能であること）
- **poppler-utils** がインストールされていること（`pdftotext` コマンドが実行可能であること）
- Linuxまたはそれに準じる環境で実行されること

## 処理手順

1. コンテキストからExcelファイルのパスを取得する
2. プロジェクトルートを `git rev-parse --show-toplevel` で自動検出する
3. `.github/work/` ディレクトリが存在しない場合は自動作成する
4. LibreOfficeコマンドでExcelファイルをPDFに変換する
   ```bash
   libreoffice --headless --convert-to pdf --outdir ".github/work/" "<Excelファイルパス>"
   ```
5. `pdftotext` コマンドを使用してPDFからテキストを抽出する
6. 抽出したテキストをMarkdown形式に整形して `.github/work/<ファイル名>.md` に出力する

## 出力パス規約

| ファイル種別 | 出力パス |
|---|---|
| 一時出力PDF | `{プロジェクトルート}/.github/work/{Excelファイル名（拡張子なし）}.pdf` |
| 最終出力Markdown | `{プロジェクトルート}/.github/work/{Excelファイル名（拡張子なし）}.md` |

## 使用するスクリプト

変換処理は `.github/scripts/excel-to-markdown.sh` で実行します。

```bash
.github/scripts/excel-to-markdown.sh <Excelファイルパス>
```

## PDF → Markdown 変換ガイドライン

テキスト抽出後のMarkdown整形には以下のルールを適用する：

- **表形式データ**: タブ区切りや空白で整列されたデータはMarkdownテーブル（`|`）に変換する
- **見出し**: 大文字のみのテキストや短い行（見出しと推定されるもの）は `#` 見出しとして扱う
- **箇条書き**: 番号付きリストや記号付きの行は `-` を用いた箇条書きに変換する
- **画像**: PDF内の画像は無視し、テキスト情報のみを処理する
- **改ページ**: PDFの改ページはMarkdownの水平線（`---`）として表現する

## エラーハンドリング

- Excelファイルが存在しない場合はエラーメッセージを出力して終了する
- LibreOfficeがインストールされていない場合はインストール手順を案内して終了する
- PDF変換に失敗した場合は詳細なエラー内容を出力して終了する
