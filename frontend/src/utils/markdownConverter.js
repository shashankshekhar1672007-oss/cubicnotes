/**
 * Converts rich Tiptap editor HTML content into clean standard Markdown text.
 */
export const htmlToMarkdown = (html) => {
  if (!html) return "";
  
  let md = html;
  
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  
  // Task Lists
  md = md.replace(/<li[^>]*data-checked="true"[^>]*>(.*?)<\/li>/gi, '- [x] $1\n');
  md = md.replace(/<li[^>]*data-checked="false"[^>]*>(.*?)<\/li>/gi, '- [ ] $1\n');
  
  // Standard Lists items
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Remove wrapping list containers
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');

  // Inline styling replacements
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*><code[^>]*>\s*([\s\S]*?)\s*<\/code><\/pre>/gis, '```\n$1\n```\n\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<hr[^>]*>/gi, '---\n\n');
  
  // Images
  md = md.replace(/<img([^>]+)>/gi, (match, attrs) => {
    const hasWidth = /width\s*=\s*["'][^"']+["']/i.test(attrs) || /style\s*=\s*["'][^"']*width/i.test(attrs);
    if (hasWidth) {
      return match;
    }
    const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const altMatch = /alt\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";
    return `![${alt}](${src})`;
  });
  
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Temporarily protect allowed HTML tags (tables, rows, cells, headers, spans with styles, marks, underlines, subs/sups, paragraphs, headings, figures, captions, divs)
  md = md.replace(/<(\/?(table|tr|td|th|tbody|thead|mark|span|p|h1|h2|h3|h4|h5|h6|u|sub|sup|figure|figcaption|div))([^>]*)>/gi, '___TAG_START___$1 $3___TAG_END___');

  // Strip all other HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Restore protected tags
  md = md.replace(/___TAG_START___(\/?(table|tr|td|th|tbody|thead|mark|span|p|h1|h2|h3|h4|h5|h6|u|sub|sup|figure|figcaption|div))\s*(.*?)___TAG_END___/gi, '<$1$3>');
  
  // Decode common HTML entities
  md = md.replace(/&nbsp;/g, ' ')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&amp;/g, '&')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");
         
  return md.trim();
};

export const parseMarkdown = (rawText) => {
  if (!rawText) return { title: "", subheading: "", tags: [], html: "" };

  // Normalize line endings to avoid carriage return issues
  const normalizedText = rawText.replace(/\r/g, "");

  let title = "";
  let subheading = "";
  let tags = [];
  let contentMarkdown = normalizedText.trim();

  // Parse YAML Frontmatter block if present
  const frontmatterRegex = /^---\n([\s\S]*?)\n---(?:\n|$)/;
  const match = normalizedText.match(frontmatterRegex);
  if (match) {
    contentMarkdown = normalizedText.replace(frontmatterRegex, "").trim();
    const yamlLines = match[1].split("\n");
    yamlLines.forEach((line) => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        let val = parts.slice(1).join(":").trim();
        val = val.replace(/^['"]|['"]$/g, ""); // Strip surrounding quotes
        
        if (key === "title") {
          title = val;
        } else if (key === "subheading" || key === "description") {
          subheading = val;
        } else if (key === "tags") {
          if (val.startsWith("[") && val.endsWith("]")) {
            try {
              tags = JSON.parse(val).map((t) => t.trim()).filter(Boolean);
            } catch (e) {
              tags = val.replace(/[\[\]"']/g, "").split(",").map((t) => t.trim()).filter(Boolean);
            }
          } else {
            tags = val.split(",").map((t) => t.replace(/^['"]|['"]$/g, "").trim()).filter(Boolean);
          }
        }
      }
    });
  }

  let html = contentMarkdown;
  
  // Block replacements: code blocks
  html = html.replace(/```\s*([\s\S]*?)\s*```/g, '<pre><code>$1</code></pre>');
  
  // Headers
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Horizontal Rules
  html = html.replace(/^---$/gm, '<hr>');

  // List conversions
  html = html.replace(/^\s*[-*+]\s+\[x\]\s+(.*?)$/gm, '<li data-checked="true">$1</li>');
  html = html.replace(/^\s*[-*+]\s+\[ \]\s+(.*?)$/gm, '<li data-checked="false">$1</li>');
  html = html.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li>$1</li>');
  
  // Ordered List conversions
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li data-type="ol">$1</li>');
  
  // Inline format elements
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert raw blocks separated by double newlines into HTML paragraphs
  const blocks = html.split(/\n\n+/);
  const processedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    
    // Check for list wrapping first and clean whitespaces to prevent schema parsing conflicts
    if (trimmed.includes('<li data-type="ol">')) {
      const cleanList = trimmed.replace(/\n/g, "").replace(/<li data-type="ol">/g, "<li>");
      return `<ol>${cleanList}</ol>`;
    }
    if (trimmed.startsWith("<li") || trimmed.includes("<li>")) {
      const cleanList = trimmed.replace(/\n/g, "");
      return `<ul>${cleanList}</ul>`;
    }
    
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<pre") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<table") ||
      trimmed.startsWith("<tr") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<p") ||
      trimmed.startsWith("<u") ||
      trimmed.startsWith("<sub") ||
      trimmed.startsWith("<sup") ||
      trimmed.startsWith("<span") ||
      trimmed.startsWith("<mark") ||
      trimmed.startsWith("<img") ||
      trimmed.startsWith("<figure") ||
      trimmed.startsWith("<figcaption") ||
      trimmed.startsWith("<div")
    ) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  });
  
  return {
    title: title || "",
    subheading: subheading || "",
    tags,
    contentMarkdown,
    html: processedBlocks.filter(Boolean).join("\n")
  };
};
