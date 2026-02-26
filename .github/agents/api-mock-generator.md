---
description: "Markdown API設計書から Hono モックAPIを自動生成する"
---

# API Mock Generator

## 概要

`.github/work/` ディレクトリに配置されたMarkdown形式のAPI設計書を読み込み、`packages/piyo-backend` にHonoベースのモックAPIルートを自動生成するエージェントです。

- **入力**: `.github/work/*.md` — Markdown形式のAPI設計書
- **出力**: `packages/piyo-backend/src/routes/<resource>.ts`、`packages/piyo-backend/src/mock-data/<resource>.ts`、`packages/piyo-backend/src/index.ts`（更新）

既存の `packages/piyo-backend/src/index.ts` のルート（`/`、`/users`、`/user`）は**絶対に削除・変更しない**こと。

---

## 手順

1. `.github/work/` 配下のMarkdownファイルをすべて列挙する。
2. 各Markdownファイルを読み込み、**「入力仕様」** セクションと **「出力仕様」** セクションを解析する。
3. 解析結果をもとに以下のファイルを生成・更新する:
   - `packages/piyo-backend/src/mock-data/<resource>.ts` — モックデータ定義
   - `packages/piyo-backend/src/routes/<resource>.ts` — Honoルート定義
   - `packages/piyo-backend/src/index.ts` — 新ルートを `.route()` でマウント
4. 生成したコードが既存の biome.json 設定（スペースインデント、ダブルクォート）に準拠しているか確認する。

---

## 設計書フォーマット

各Markdownファイルは以下の構造に従うことを期待します。

```markdown
# <リソース名> API

## API概要
- ベースパス: `/<resource>`

## エンドポイント一覧
| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | /<resource> | 一覧取得 |
...

---

## GET /<resource>

### 入力仕様
- メソッド: GET
- パス: `/<resource>`

クエリパラメータ:

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

### 出力仕様
- ステータスコード: 200

レスポンスボディ:

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| ... | ... | ... |

サンプルレスポンス:

```json
{ ... }
```

---

## POST /<resource>

### 入力仕様
- メソッド: POST
- パス: `/<resource>`

リクエストボディ (JSON):

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

### 出力仕様
- ステータスコード: 201

レスポンスボディ:

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| ... | ... | ... |

サンプルレスポンス:

```json
{ ... }
```
```

---

## コード生成ルール

### ファイル命名規則

- **リソース名**: Markdownファイルのベースパス（例: `/tasks` → `tasks`）をリソース名として使用する。
- **ルートファイル**: `packages/piyo-backend/src/routes/<resource>.ts`
- **モックデータファイル**: `packages/piyo-backend/src/mock-data/<resource>.ts`

### モックデータファイル (`mock-data/<resource>.ts`)

- 出力仕様の**サンプルレスポンス**をもとに固定のモックデータを定義する。
- 型は `zod` スキーマから `z.infer<>` で導出するか、明示的なTypeScript型として定義する。
- 例:

```typescript
export const mockTasks = [
  { id: 1, title: "タスク1", status: "todo", createdAt: "2024-01-01T00:00:00Z" },
  { id: 2, title: "タスク2", status: "in_progress", createdAt: "2024-01-02T00:00:00Z" },
];
```

### ルートファイル (`routes/<resource>.ts`)

- `new Hono()` でルーターを作成し、メソッドチェーンでエンドポイントを定義する。
- 入力仕様のリクエストボディ/クエリパラメータは `zod` でスキーマを定義し、`zValidator` でバリデーションを適用する。
- モックデータは `mock-data/<resource>.ts` からインポートする。
- GETの一覧取得では `c.json(mockXxx)` を返す。
- GETの詳細取得ではパスパラメータ（`:id`）で絞り込み、見つからない場合は `c.json({ error: "Not Found" }, 404)` を返す。
- POSTでは受け取ったデータにIDを付与してモックレスポンスを返す（`201` ステータス）。
- PUT/PATCHでは対象をIDで検索し、マージしたオブジェクトを返す（見つからない場合は404）。
- DELETEでは `c.json({ message: "Deleted" }, 200)` を返す。
- 例:

```typescript
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { mockTasks } from "../mock-data/tasks";

const taskSchema = z.object({
  title: z.string(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
});

const tasksRoute = new Hono()
  .get("/tasks", (c) => {
    return c.json(mockTasks);
  })
  .get("/tasks/:id", (c) => {
    const id = Number(c.req.param("id"));
    const task = mockTasks.find((t) => t.id === id);
    if (!task) return c.json({ error: "Not Found" }, 404);
    return c.json(task);
  })
  .post("/tasks", zValidator("json", taskSchema), (c) => {
    const body = c.req.valid("json");
    const newTask = { id: mockTasks.length + 1, ...body, createdAt: new Date().toISOString() };
    return c.json(newTask, 201);
  })
  .put("/tasks/:id", zValidator("json", taskSchema.partial()), (c) => {
    const id = Number(c.req.param("id"));
    const task = mockTasks.find((t) => t.id === id);
    if (!task) return c.json({ error: "Not Found" }, 404);
    const body = c.req.valid("json");
    return c.json({ ...task, ...body });
  })
  .delete("/tasks/:id", (c) => {
    return c.json({ message: "Deleted" });
  });

export default tasksRoute;
```

### メインファイルの更新 (`index.ts`)

- 既存の `const app = new Hono()` の定義に `.route("/", <resource>Route)` を追加する。
- 既存ルート（`/`、`/users`、`/user`）は**変更しない**。
- インポート文は既存のインポートの後に追加する。
- 例:

```typescript
import tasksRoute from "./routes/tasks";

const app = new Hono()
  .use("*", cors({ origin: "*" }))
  .get("/", (c) => { ... })          // 既存ルート（変更しない）
  .get("/users", (c) => { ... })     // 既存ルート（変更しない）
  .post("/user", ..., (c) => { ... }) // 既存ルート（変更しない）
  .route("/", tasksRoute);           // 新規追加
```

### コードスタイル規約

- **インデント**: スペース2文字
- **クォート**: ダブルクォート `"`
- **セミコロン**: あり
- **Linter**: biome recommended ルール準拠
- `z.object()` のフィールドは設計書の「入力仕様」テーブルの型（`string`、`number`、`boolean`）をそのままzodの型（`z.string()`、`z.number()`、`z.boolean()`）に変換する。
- 任意（必須=いいえ）フィールドには `.optional()` を付与する。

---

## 出力ファイル

各設計書1ファイルにつき以下を生成・更新する:

| ファイル | 操作 |
| --- | --- |
| `packages/piyo-backend/src/mock-data/<resource>.ts` | 新規作成 |
| `packages/piyo-backend/src/routes/<resource>.ts` | 新規作成 |
| `packages/piyo-backend/src/index.ts` | 既存ファイルに `.route()` 呼び出しとインポートを追加 |

> **注意**: `packages/piyo-backend` に新しい依存パッケージを追加してはならない。既存の `hono`、`@hono/zod-validator`、`zod` を使用すること。
