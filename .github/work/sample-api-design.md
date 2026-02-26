# タスク管理 API

## API概要

- **説明**: タスクの作成・取得・更新・削除を行うタスク管理API
- **ベースパス**: `/tasks`

## エンドポイント一覧

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/tasks` | タスク一覧取得 |
| GET | `/tasks/:id` | タスク詳細取得 |
| POST | `/tasks` | タスク作成 |
| PUT | `/tasks/:id` | タスク更新 |
| DELETE | `/tasks/:id` | タスク削除 |

---

## GET /tasks

### 入力仕様

- メソッド: GET
- パス: `/tasks`

クエリパラメータ:

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| status | string | いいえ | フィルタするステータス (`todo` / `in_progress` / `done`) |

### 出力仕様

- ステータスコード: 200

レスポンスボディ (配列):

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| id | number | タスクID |
| title | string | タスクタイトル |
| description | string | タスクの説明 |
| status | string | ステータス (`todo` / `in_progress` / `done`) |
| createdAt | string | 作成日時 (ISO 8601) |

サンプルレスポンス:

```json
[
  {
    "id": 1,
    "title": "タスク1",
    "description": "最初のタスクです",
    "status": "todo",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "title": "タスク2",
    "description": "進行中のタスクです",
    "status": "in_progress",
    "createdAt": "2024-01-02T00:00:00Z"
  },
  {
    "id": 3,
    "title": "タスク3",
    "description": "完了済みのタスクです",
    "status": "done",
    "createdAt": "2024-01-03T00:00:00Z"
  }
]
```

---

## GET /tasks/:id

### 入力仕様

- メソッド: GET
- パス: `/tasks/:id`

パスパラメータ:

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | number | はい | タスクID |

### 出力仕様

- ステータスコード: 200（成功時）、404（対象なし）

レスポンスボディ (成功時):

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| id | number | タスクID |
| title | string | タスクタイトル |
| description | string | タスクの説明 |
| status | string | ステータス (`todo` / `in_progress` / `done`) |
| createdAt | string | 作成日時 (ISO 8601) |

サンプルレスポンス:

```json
{
  "id": 1,
  "title": "タスク1",
  "description": "最初のタスクです",
  "status": "todo",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## POST /tasks

### 入力仕様

- メソッド: POST
- パス: `/tasks`

リクエストボディ (JSON):

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| title | string | はい | タスクタイトル |
| description | string | いいえ | タスクの説明 |
| status | string | いいえ | ステータス (`todo` / `in_progress` / `done`)、デフォルト: `todo` |

### 出力仕様

- ステータスコード: 201

レスポンスボディ:

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| id | number | 生成されたタスクID |
| title | string | タスクタイトル |
| description | string | タスクの説明 |
| status | string | ステータス |
| createdAt | string | 作成日時 (ISO 8601) |

サンプルレスポンス:

```json
{
  "id": 4,
  "title": "新しいタスク",
  "description": "新規作成されたタスクです",
  "status": "todo",
  "createdAt": "2024-01-04T00:00:00Z"
}
```

---

## PUT /tasks/:id

### 入力仕様

- メソッド: PUT
- パス: `/tasks/:id`

パスパラメータ:

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | number | はい | タスクID |

リクエストボディ (JSON):

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| title | string | いいえ | タスクタイトル |
| description | string | いいえ | タスクの説明 |
| status | string | いいえ | ステータス (`todo` / `in_progress` / `done`) |

### 出力仕様

- ステータスコード: 200（成功時）、404（対象なし）

レスポンスボディ (成功時):

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| id | number | タスクID |
| title | string | タスクタイトル |
| description | string | タスクの説明 |
| status | string | ステータス |
| createdAt | string | 作成日時 (ISO 8601) |

サンプルレスポンス:

```json
{
  "id": 1,
  "title": "更新されたタスク1",
  "description": "最初のタスクです",
  "status": "in_progress",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## DELETE /tasks/:id

### 入力仕様

- メソッド: DELETE
- パス: `/tasks/:id`

パスパラメータ:

| フィールド名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | number | はい | タスクID |

### 出力仕様

- ステータスコード: 200（成功時）、404（対象なし）

レスポンスボディ:

| フィールド名 | 型 | 説明 |
| --- | --- | --- |
| message | string | 結果メッセージ |

サンプルレスポンス:

```json
{
  "message": "Deleted"
}
```
