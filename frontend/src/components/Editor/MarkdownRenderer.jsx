import { parseMarkdown } from "../../utils/parseMarkdown";

/**
 * Renders markdown-formatted note content as HTML.
 * NOTE: parseMarkdown does basic escaping before transforming, but if you
 * later accept richer HTML input, swap in DOMPurify before render.
 */
const MarkdownRenderer = ({ content }) => {
  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

export default MarkdownRenderer;
