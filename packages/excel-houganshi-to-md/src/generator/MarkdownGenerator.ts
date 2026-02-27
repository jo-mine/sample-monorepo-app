import type {
  DocumentNode,
  HeadingNode,
  HorizontalRuleNode,
  ImageNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  SectionNode,
  TableNode,
} from "../ir/types.js";

export class MarkdownGenerator {
  generate(nodes: DocumentNode[]): string {
    const parts = nodes.map((node) => this.renderNode(node));
    let result = parts.join("\n\n");
    // Collapse 3+ consecutive newlines to 2
    result = result.replace(/\n{3,}/g, "\n\n");
    // Ensure trailing newline
    if (!result.endsWith("\n")) {
      result += "\n";
    }
    return result;
  }

  private renderNode(node: DocumentNode): string {
    switch (node.type) {
      case "heading":
        return this.renderHeading(node);
      case "paragraph":
        return this.renderParagraph(node);
      case "table":
        return this.renderTable(node);
      case "list":
        return this.renderList(node);
      case "image":
        return this.renderImage(node);
      case "section":
        return this.renderSection(node);
      case "horizontal_rule":
        return this.renderHorizontalRule(node);
    }
  }

  private renderHeading(node: HeadingNode): string {
    const prefix = "#".repeat(node.level);
    return `${prefix} ${node.text}`;
  }

  private renderParagraph(node: ParagraphNode): string {
    let text = node.text;
    if (node.bold && node.italic) {
      text = `***${text}***`;
    } else if (node.bold) {
      text = `**${text}**`;
    } else if (node.italic) {
      text = `*${text}*`;
    }
    return text;
  }

  private renderTable(node: TableNode): string {
    const escapeCell = (s: string): string =>
      s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "<br>");

    const colCount = node.headers.length;

    const headerRow = `| ${node.headers.map(escapeCell).join(" | ")} |`;
    const separator = `| ${node.headers.map(() => "---").join(" | ")} |`;

    const dataRows = node.rows.map((row) => {
      const padded = [...row];
      while (padded.length < colCount) padded.push("");
      return `| ${padded.map(escapeCell).join(" | ")} |`;
    });

    return [headerRow, separator, ...dataRows].join("\n");
  }

  private renderList(node: ListNode, depth = 0): string {
    return node.items
      .map((item, i) => this.renderListItem(item, node.ordered, depth, i))
      .join("\n");
  }

  private renderListItem(
    item: ListItemNode,
    ordered: boolean,
    depth: number,
    index: number,
  ): string {
    const indent = "  ".repeat(depth);
    const bullet = ordered ? `${index + 1}.` : "-";
    const line = `${indent}${bullet} ${item.text}`;

    if (item.children && item.children.length > 0) {
      const childLines = item.children
        .map((child, i) => this.renderListItem(child, ordered, depth + 1, i))
        .join("\n");
      return `${line}\n${childLines}`;
    }

    return line;
  }

  private renderImage(node: ImageNode): string {
    return `![${node.alt}](${node.path})`;
  }

  private renderSection(node: SectionNode): string {
    const title = `## ${node.title}`;
    const children = node.children
      .map((child) => this.renderNode(child))
      .join("\n\n");
    return children ? `${title}\n\n${children}` : title;
  }

  private renderHorizontalRule(_node: HorizontalRuleNode): string {
    return "---";
  }
}
