import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

const app = new Hono()
  .use("*", cors({
    origin: "*",
  }))
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .get("/users", (c) => {
    return c.json([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
  })
  .post(
    "/user",
    zValidator(
      "form",
      z.object({
        name: z.string().optional(),
      }),
    ),
    (c) => {
      const form = c.req.valid("form");
      return c.json({ message: "User created", user: form });
    },
  );
export type App = typeof app;
export default app;
