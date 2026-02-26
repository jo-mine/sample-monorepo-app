# Excel設計書 → Markdown 変換エージェントスキル

## 説明

このスキルは、Excel形式（`.xlsx` / `.xls`）の設計書を受け取り、その内容をMarkdown形式に変換します。
設計書の構造（見出し、表、テキスト等）を可能な限り保持したMarkdownファイルを生成することを目的とします。

## 入力

- **Excelファイル**：コンテキストとして受け取る `.xlsx` または `.xls` ファイル

## 前提条件

- **LibreOffice** がインストールされていること（Excel → PDF変換に使用）
  - インストール例: `sudo apt-get install libreoffice`
- **pdftotext**（poppler-utils）がインストールされていること（PDF → テキスト抽出に使用）
  - インストール例: `sudo apt-get install poppler-utils`

## 処理手順

1. コンテキストとして渡されたExcelファイルのパスを確認する
2. `.github/scripts/excel-to-markdown.sh` スクリプトを使用して変換を実行する
   ```bash
   .github/scripts/excel-to-markdown.sh <Excelファイルのパス>
   ```
3. スクリプトは以下の手順で処理を行う：
   1. プロジェクトルートを自動検出する
   2. `.github/work/` ディレクトリが存在しない場合は自動作成する
   3. LibreOfficeを使用してExcelファイルをPDFに変換する
   4. `pdftotext` を使用してPDFからテキストを抽出する
   5. 抽出したテキストをMarkdown形式に整形して出力する

## 出力先パス規約

| ファイル種別 | パス |
|---|---|
| 一時出力PDF | `{プロジェクトルート}/.github/work/{Excelファイル名（拡張子なし）}.pdf` |
| 最終出力Markdown | `{プロジェクトルート}/.github/work/{Excelファイル名（拡張子なし）}.md` |

- PDFは一時ファイルであり、`.gitignore` によりGit管理対象外となっています
- Markdownは最終成果物であり、Gitにコミットされます

## PDF → Markdown 変換ガイドライン

- **表形式データ**：スペース区切りやタブ区切りで整列されたデータはMarkdownテーブルに変換する
- **見出し**：大文字のみのテキスト行や、前後に空行を持つ短い行は見出し（`#`、`##` 等）として扱う
- **箇条書き**：`・`、`-`、`*`、番号で始まる行は箇条書き（`-`）として変換する
- **画像**：PDFから抽出されたテキストには画像情報は含まれないため、無視する
- **ページ区切り**：PDFのページ区切りは水平線（`---`）として表現する
