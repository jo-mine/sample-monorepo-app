import { describe, expect, test } from "bun:test";
import { MarkdownGenerator } from "../src/generator/MarkdownGenerator.js";
import type {
  DocumentNode,
  HeadingNode,
  HorizontalRuleNode,
  ImageNode,
  ListNode,
  ParagraphNode,
  TableNode,
} from "../src/ir/types.js";

const generator = new MarkdownGenerator();

describe("MarkdownGenerator", () => {
  describe("heading rendering", () => {
    test("renders H1", () => {
      const node: HeadingNode = { type: "heading", level: 1, text: "Title" };
      expect(generator.generate([node])).toBe("# Title\n");
    });

    test("renders H2", () => {
      const node: HeadingNode = { type: "heading", level: 2, text: "Section" };
      expect(generator.generate([node])).toBe("## Section\n");
    });

    test("renders H3", () => {
      const node: HeadingNode = {
        type: "heading",
        level: 3,
        text: "Subsection",
      };
      expect(generator.generate([node])).toBe("### Subsection\n");
    });

    test("renders H4", () => {
      const node: HeadingNode = { type: "heading", level: 4, text: "H4" };
      expect(generator.generate([node])).toBe("#### H4\n");
    });

    test("renders H5", () => {
      const node: HeadingNode = { type: "heading", level: 5, text: "H5" };
      expect(generator.generate([node])).toBe("##### H5\n");
    });

    test("renders H6", () => {
      const node: HeadingNode = { type: "heading", level: 6, text: "H6" };
      expect(generator.generate([node])).toBe("###### H6\n");
    });
  });

  describe("paragraph rendering", () => {
    test("renders plain paragraph", () => {
      const node: ParagraphNode = { type: "paragraph", text: "Hello world" };
      expect(generator.generate([node])).toBe("Hello world\n");
    });

    test("renders bold paragraph", () => {
      const node: ParagraphNode = {
        type: "paragraph",
        text: "Bold text",
        bold: true,
      };
      expect(generator.generate([node])).toBe("**Bold text**\n");
    });

    test("renders italic paragraph", () => {
      const node: ParagraphNode = {
        type: "paragraph",
        text: "Italic text",
        italic: true,
      };
      expect(generator.generate([node])).toBe("*Italic text*\n");
    });

    test("renders bold and italic paragraph", () => {
      const node: ParagraphNode = {
        type: "paragraph",
        text: "Both",
        bold: true,
        italic: true,
      };
      expect(generator.generate([node])).toBe("***Both***\n");
    });
  });

  describe("table rendering", () => {
    test("renders table with headers and rows", () => {
      const node: TableNode = {
        type: "table",
        headers: ["Name", "Age", "City"],
        rows: [
          ["Alice", "30", "Tokyo"],
          ["Bob", "25", "Osaka"],
        ],
      };
      const result = generator.generate([node]);
      expect(result).toContain("| Name | Age | City |");
      expect(result).toContain("| --- | --- | --- |");
      expect(result).toContain("| Alice | 30 | Tokyo |");
      expect(result).toContain("| Bob | 25 | Osaka |");
    });

    test("escapes pipe characters in cells", () => {
      const node: TableNode = {
        type: "table",
        headers: ["A|B"],
        rows: [["val|ue"]],
      };
      const result = generator.generate([node]);
      expect(result).toContain("A\\|B");
      expect(result).toContain("val\\|ue");
    });

    test("converts newlines to <br> in cells", () => {
      const node: TableNode = {
        type: "table",
        headers: ["Col"],
        rows: [["line1\nline2"]],
      };
      const result = generator.generate([node]);
      expect(result).toContain("line1<br>line2");
    });

    test("pads rows to match header column count", () => {
      const node: TableNode = {
        type: "table",
        headers: ["A", "B", "C"],
        rows: [["only"]],
      };
      const result = generator.generate([node]);
      expect(result).toContain("| only |  |  |");
    });
  });

  describe("list rendering", () => {
    test("renders unordered list", () => {
      const node: ListNode = {
        type: "list",
        ordered: false,
        items: [{ text: "Item 1" }, { text: "Item 2" }],
      };
      const result = generator.generate([node]);
      expect(result).toContain("- Item 1");
      expect(result).toContain("- Item 2");
    });

    test("renders ordered list", () => {
      const node: ListNode = {
        type: "list",
        ordered: true,
        items: [{ text: "First" }, { text: "Second" }],
      };
      const result = generator.generate([node]);
      expect(result).toContain("1. First");
      expect(result).toContain("2. Second");
    });

    test("renders nested list", () => {
      const node: ListNode = {
        type: "list",
        ordered: false,
        items: [
          {
            text: "Parent",
            children: [{ text: "Child 1" }, { text: "Child 2" }],
          },
        ],
      };
      const result = generator.generate([node]);
      expect(result).toContain("- Parent");
      expect(result).toContain("  - Child 1");
      expect(result).toContain("  - Child 2");
    });
  });

  describe("horizontal rule rendering", () => {
    test("renders horizontal rule", () => {
      const node: HorizontalRuleNode = { type: "horizontal_rule" };
      expect(generator.generate([node])).toBe("---\n");
    });
  });

  describe("image rendering", () => {
    test("renders image", () => {
      const node: ImageNode = {
        type: "image",
        alt: "alt text",
        path: "/path/to/image.png",
      };
      expect(generator.generate([node])).toBe(
        "![alt text](/path/to/image.png)\n",
      );
    });
  });

  describe("generate() with mixed node types", () => {
    test("renders multiple nodes with blank lines between them", () => {
      const nodes: DocumentNode[] = [
        { type: "heading", level: 1, text: "My Document" },
        { type: "paragraph", text: "Introduction text." },
        { type: "horizontal_rule" },
        {
          type: "table",
          headers: ["Col1", "Col2"],
          rows: [["A", "B"]],
        },
      ];
      const result = generator.generate(nodes);
      expect(result).toContain("# My Document");
      expect(result).toContain("Introduction text.");
      expect(result).toContain("---");
      expect(result).toContain("| Col1 | Col2 |");
      // Check blank lines between sections
      expect(result).toContain("# My Document\n\nIntroduction text.");
    });

    test("collapses 3+ consecutive newlines to 2", () => {
      const nodes: DocumentNode[] = [
        { type: "paragraph", text: "A" },
        { type: "paragraph", text: "B" },
      ];
      const result = generator.generate(nodes);
      expect(result).not.toMatch(/\n{3,}/);
    });

    test("ensures trailing newline", () => {
      const nodes: DocumentNode[] = [{ type: "paragraph", text: "End" }];
      const result = generator.generate(nodes);
      expect(result.endsWith("\n")).toBe(true);
    });
  });
});
