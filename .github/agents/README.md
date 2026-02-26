# Agents ディレクトリ — 使い方ガイド

このディレクトリには、GitHub Copilot coding agent 用のカスタムエージェント定義ファイルが格納されています。

---

## エージェント一覧

| ファイル | 概要 |
| --- | --- |
| [`api-mock-generator.md`](./api-mock-generator.md) | Markdown形式のAPI設計書から Hono モックAPIを自動生成する |

---

## api-mock-generator — 使い方

### 概要

`.github/work/` に配置したMarkdown形式のAPI設計書を読み込み、`packages/piyo-backend` にHonoベースのモックAPIルートを自動生成するエージェントです。

既存の `packages/piyo-backend/src/index.ts` のルート（`/`、`/users`、`/user`）は変更されません。

---

### 使い方（ステップ）

#### 1. API設計書を配置する

`.github/work/` ディレクトリに、Markdown形式のAPI設計書を作成します。

```
.github/work/
└── <resource>-api-design.md   # 例: tasks-api-design.md
```

設計書のフォーマットは後述の「設計書フォーマットガイドライン」を参照してください。

#### 2. エージェントを呼び出す

GitHub Copilot chat で以下のように指示します（`@api-mock-generator` エージェントが利用可能な場合）:

```
@api-mock-generator .github/work/tasks-api-design.md を読み込んで、piyo-backend にモックAPIを生成してください。
```

または、新しいIssueやPRのコメントでエージェントをメンションします。

#### 3. 生成されたコードをPRで確認する

エージェントは以下のファイルを生成・更新します。PRをレビューして問題がなければマージしてください。

```
packages/piyo-backend/
├── src/
│   ├── index.ts                   # 既存 + 新ルートのマウント追加
│   ├── routes/
│   │   └── <resource>.ts          # 設計書ごとのルートファイル
│   └── mock-data/
│       └── <resource>.ts          # モックレスポンスデータ
```

---

### 設計書フォーマットガイドライン

エージェントが正しくコードを生成するために、以下の構造に従ってMarkdownを記述してください。

#### ファイル構造の概要

```markdown
# <リソース名> API

## API概要
- ベースパス: `/<resource>`

## エンドポイント一覧
| メソッド | パス | 説明 |
...

---

## <メソッド> <パス>

### 入力仕様
...

### 出力仕様
...
```

#### 「入力仕様」セクションの書き方

各エンドポイントの `### 入力仕様` セクションには以下を含めます。

- `- メソッド: <GET|POST|PUT|DELETE>` — HTTPメソッド
- `- パス: \`/<resource>\`` — エンドポイントパス
- リクエストボディまたはクエリパラメータのテーブル:

```markdown
| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| title | string | はい | タスクタイトル |
| description | string | いいえ | タスクの説明 |
```

型は以下の値を使用します:
- `string` → `z.string()`
- `number` → `z.number()`
- `boolean` → `z.boolean()`
- 必須が「いいえ」の場合は `.optional()` が付与されます。

#### 「出力仕様」セクションの書き方

各エンドポイントの `### 出力仕様` セクションには以下を含めます。

- `- ステータスコード: <200|201|...>` — レスポンスのHTTPステータスコード
- レスポンスボディのテーブル:

```markdown
| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| id | number | タスクID |
| title | string | タスクタイトル |
```

- **サンプルレスポンス**（JSONコードブロック）: モックデータとして使用されます。

````markdown
サンプルレスポンス:

```json
{
  "id": 1,
  "title": "タスク1",
  "status": "todo"
}
```
````

> **重要**: サンプルレスポンスがないと、エージェントはモックデータを生成できません。必ず含めてください。

---

### 生成されるコードの構造

#### `mock-data/<resource>.ts`

出力仕様のサンプルレスポンスをもとに固定のモックデータを定義します。

```typescript
export const mockTasks = [
  { id: 1, title: "タスク1", status: "todo", createdAt: "2024-01-01T00:00:00Z" },
  { id: 2, title: "タスク2", status: "in_progress", createdAt: "2024-01-02T00:00:00Z" },
];
```

#### `routes/<resource>.ts`

入力仕様のスキーマを `zod` で定義し、Honoルートを実装します。

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
  .get("/tasks", (c) => c.json(mockTasks))
  .get("/tasks/:id", (c) => {
    const id = Number(c.req.param("id"));
    const task = mockTasks.find((t) => t.id === id);
    if (!task) return c.json({ error: "Not Found" }, 404);
    return c.json(task);
  })
  .post("/tasks", zValidator("json", taskSchema), (c) => {
    const body = c.req.valid("json");
    return c.json({ id: mockTasks.length + 1, ...body }, 201);
  });

export default tasksRoute;
```

#### `index.ts`（更新箇所）

既存ルートの後に `.route()` でマウントされます。

```typescript
import tasksRoute from "./routes/tasks";  // 追加

const app = new Hono()
  .use("*", cors({ origin: "*" }))
  .get("/", ...)      // 既存（変更なし）
  .get("/users", ...) // 既存（変更なし）
  .post("/user", ...) // 既存（変更なし）
  .route("/", tasksRoute);  // 追加
```

---

### サンプル設計書

動作確認用のサンプル設計書が [`.github/work/sample-api-design.md`](../work/sample-api-design.md) に用意されています。タスク管理APIを題材にした設計書です。
