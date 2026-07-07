/**
 * Recursively extracts plain text from a Tiptap JSON content node.
 * Useful for calculating word counts, search indexes, or previews.
 */
export const getTextFromTiptapJSON = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }
  if (Array.isArray(node.content)) {
    return node.content.map(getTextFromTiptapJSON).join(" ");
  }
  if (Array.isArray(node)) {
    return node.map(getTextFromTiptapJSON).join(" ");
  }
  if (typeof node === "object") {
    return Object.values(node).map(getTextFromTiptapJSON).join(" ");
  }
  return "";
};

/**
 * Recursively converts Tiptap JSON schema structure to clean Markdown text.
 */
export const tiptapToMarkdown = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  
  if (node.type === "text") {
    let text = node.text || "";
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "link") text = `[${text}](${mark.attrs?.href || ""})`;
      });
    }
    return text;
  }

  const contentText = Array.isArray(node.content)
    ? node.content.map(tiptapToMarkdown).join("")
    : "";

  switch (node.type) {
    case "doc":
      return Array.isArray(node.content) ? node.content.map(tiptapToMarkdown).join("\n\n") : "";
    case "paragraph":
      return contentText;
    case "heading": {
      const level = node.attrs?.level || 1;
      return `${"#".repeat(level)} ${contentText}`;
    }
    case "blockquote":
      return `> ${contentText}`;
    case "codeBlock":
      return `\`\`\`\n${contentText}\n\`\`\``;
    case "horizontalRule":
      return "---";
    case "bulletList":
      return Array.isArray(node.content)
        ? node.content.map((item) => `* ${tiptapToMarkdown(item)}`).join("\n")
        : "";
    case "orderedList":
      return Array.isArray(node.content)
        ? node.content.map((item, index) => `${index + 1}. ${tiptapToMarkdown(item)}`).join("\n")
        : "";
    case "listItem":
      return contentText;
    case "taskList":
      return Array.isArray(node.content)
        ? node.content.map((item) => tiptapToMarkdown(item)).join("\n")
        : "";
    case "taskItem": {
      const checked = node.attrs?.checked ? "[x]" : "[ ]";
      return `${checked} ${contentText}`;
    }
    default:
      return contentText;
  }
};