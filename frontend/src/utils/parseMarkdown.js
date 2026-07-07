/**
 * Extremely lightweight markdown → HTML parser covering the common cases
 * (headings, bold, italic, inline code, links, lists). For full CommonMark
 * support, swap this out for `marked` or `react-markdown` later.
 */
export const parseMarkdown = (text = "") => {
  let html = text
    // escape basic HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/~~(.*?)~~/g, "<s>$1</s>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^[-*] (.*$)/gim, "<li>$1</li>")
    .replace(/\n/g, "<br />");

  return html;
};

/** Strips markdown syntax for plain-text previews (note cards, search results) */
export const stripMarkdown = (text = "") =>
  text
    .replace(/[#*`_~>]/g, "")
    .replace(/~~/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
