# @jo-mine/excel-houganshi-to-md

Excel方眼紙（ほうがんし）形式の設計書をMarkdownに変換するパッケージです。

## 概要

Excel方眼紙とは、日本のソフトウェア開発現場でよく見られる、Excelのセルを均一に小さくして（方眼紙状にして）セルを大量に結合することでドキュメントレイアウトを作成する手法です。このパッケージは、そのような形式のExcelファイル（`.xlsx`）を解析し、Markdownへと変換します。

### 主な特徴

- セル結合の自動解決
- ボーダー情報に基づくテーブル検出（フラッドフィル）
- フォントサイズ・太字・背景色に基づく見出し検出
- CLI・ライブラリ両対応
- TypeScript完全対応

---

## インストール

```bash
bun add @jo-mine/excel-houganshi-to-md
```

---

## CLI 使用方法

```bash
# Excelファイルを変換して標準出力に表示
bun run src/index.ts input.xlsx

# 出力ディレクトリを指定して各シートをMarkdownファイルとして保存
bun run src/index.ts input.xlsx ./output
```

---

## ライブラリ API 使用例

### シンプルな例

```typescript
import { convertExcelToMarkdown } from "@jo-mine/excel-houganshi-to-md";

const results = await convertExcelToMarkdown("design.xlsx");

for (const [sheetName, markdown] of results) {
  console.log(`=== ${sheetName} ===`);
  console.log(markdown);
}
```

### 高度な例

```typescript
import { convertExcelToMarkdown } from "@jo-mine/excel-houganshi-to-md";

const results = await convertExcelToMarkdown("design.xlsx", {
  // 出力ディレクトリを指定（各シートが .md ファイルとして保存される）
  outputDir: "./output",
  // 特定のシートのみ変換する
  sheetNames: ["基本設計", "詳細設計"],
});

for (const [sheetName, markdown] of results) {
  console.log(`変換完了: ${sheetName}`);
}
```

### 各クラスを個別に使う例

```typescript
import {
  ExcelParser,
  HeadingDetector,
  MarkdownGenerator,
  MergedCellResolver,
  StructureAnalyzer,
  TableDetector,
} from "@jo-mine/excel-houganshi-to-md";

// Excelの解析
const parser = new ExcelParser();
const sheets = await parser.parse("design.xlsx");

// セル結合の解決
const resolver = new MergedCellResolver();
const grid = resolver.resolve(sheets[0]);

// 構造解析
const analyzer = new StructureAnalyzer(11); // baseFontSize=11
const nodes = analyzer.analyze(sheets[0]);

// Markdown生成
const generator = new MarkdownGenerator();
const markdown = generator.generate(nodes);

console.log(markdown);
```

---

## アーキテクチャ

本パッケージは以下のパイプラインで動作します：

```
Excel (.xlsx) ファイル
       │
       ▼
 ExcelParser (exceljs)
  ─ セル値・スタイル・結合情報を抽出
       │
       ▼
 MergedCellResolver
  ─ 結合セルを論理グリッドに解決
       │
       ▼
 StructureAnalyzer (オーケストレーター)
  ├── TableDetector
  │    ─ ボーダー情報でテーブル領域を検出（フラッドフィル）
  └── HeadingDetector
       ─ フォントサイズ・太字・背景色で見出しを検出
       │
       ▼
 中間表現 (IR: DocumentNode[])
       │
       ▼
 MarkdownGenerator
  ─ IR → Markdownテキスト
       │
       ▼
  Markdown (.md) ファイル / 文字列
```

### 各レイヤーの説明

#### `ExcelParser`
`exceljs` ライブラリを使用して `.xlsx` ファイルを読み込みます。各セルの値（リッチテキスト・数式・日付含む）、スタイル情報（フォント・塗りつぶし・ボーダー・配置）、結合セル情報を `ParsedSheet` 型として返します。

#### `MergedCellResolver`
結合セル情報をもとに、結合範囲の左上セルのみに値を残した論理グリッドを構築します。重複処理を防ぐために結合範囲内のセルを訪問済みとしてマークします。

#### `HeadingDetector`
以下のヒューリスティックに基づいて見出しを検出します：

| 条件 | 見出しレベル |
| --- | --- |
| フォントサイズ ≥ 20 | H1 |
| フォントサイズ ≥ 16 | H2 |
| フォントサイズ ≥ 14 + 太字 | H2 |
| フォントサイズ ≥ 14 | H3 |
| フォントサイズ ≥ 12 + 太字 + 背景色あり | H3 |
| フォントサイズ ≥ 12 + 太字 | H4 |
| 太字 + 背景色あり | H4 |
| 太字のみ | H5 |

#### `TableDetector`
ボーダーを持つセルをフラッドフィルで連結し、矩形のテーブル領域を検出します。2行2列以上の領域のみをテーブルとして扱います。最初の行が太字または背景色を持つ場合はヘッダー行として扱います。

#### `StructureAnalyzer`
上記の検出器を組み合わせて `DocumentNode[]` の中間表現を生成します。テーブルセルに属さないセルは見出しまたは段落として処理されます。

#### `MarkdownGenerator`
`DocumentNode[]` の中間表現をMarkdownテキストに変換します。テーブルのパイプ文字エスケープや改行の `<br>` 変換、ネストされたリストのインデントなども処理します。

---

## 中間表現 (IR) の型

```typescript
type DocumentNode =
  | HeadingNode        // 見出し
  | ParagraphNode      // 段落
  | TableNode          // テーブル
  | ListNode           // リスト
  | ImageNode          // 画像
  | SectionNode        // セクション
  | HorizontalRuleNode // 水平線
```

---

## 今後の改善予定

- **AI支援による構造認識**: LLMを活用したより高精度な構造解析
- **テンプレートマッチング**: よく使われる方眼紙パターンの自動認識
- **画像抽出**: Excelに埋め込まれた画像の抽出・保存
- **双方向変換**: Markdown → Excel方眼紙への逆変換
- **カスタムヒューリスティック**: 組織独自の命名規則・スタイルルールへの対応
- **複数シートの統合**: シート間の参照解決と統合ドキュメント生成
