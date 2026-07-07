import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useDebounce } from "../hooks/useDebounce";
import PageSidebar from "../components/Document/PageSidebar";
import DocumentEditor from "../components/Document/DocumentEditor";
import Button from "../components/UI/Button";
import Modal from "../components/UI/Modal";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import FloatingAIIcon from "../components/UI/FloatingAIIcon";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_NOTEBOOKS, GHOST_PAGES } from "../data/ghostDemoData";
import "../assets/styles/pages/notebookWorkspace.css";
import "../assets/styles/components/editor-overrides.css";
import { parseMarkdown as parseMarkdownFile, htmlToMarkdown } from "../utils/markdownConverter";
import TemplateSelectorModal from "../components/UI/TemplateSelectorModal";

// Recursive helper to extract raw plain text from Tiptap JSON content structure
const getTextFromTiptapJSON = (node) => {
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

// Recursive helper to translate Tiptap JSON schema structure to Markdown text
const tiptapToMarkdown = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  
  if (node.type === "text") {
    let text = node.text || "";
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "subscript") text = `<sub>${text}</sub>`;
        if (mark.type === "superscript") text = `<sup>${text}</sup>`;
        if (mark.type === "link") text = `[${text}](${mark.attrs?.href || ""})`;
        if (mark.type === "highlight") {
          const color = mark.attrs?.color || "#ffeb3b";
          text = `<mark style="background-color: ${color}">${text}</mark>`;
        }
        if (mark.type === "textStyle") {
          const styles = [];
          if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`);
          if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`);
          if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`);
          if (mark.attrs?.lineHeight) styles.push(`line-height: ${mark.attrs.lineHeight}`);
          if (mark.attrs?.textCase) {
            const transform = mark.attrs.textCase === "uppercase" ? "uppercase" : 
                              mark.attrs.textCase === "lowercase" ? "lowercase" : 
                              mark.attrs.textCase === "capitalize" ? "capitalize" : "none";
            styles.push(`text-transform: ${transform}`);
          }
          if (styles.length > 0) {
            text = `<span style="${styles.join("; ")}">${text}</span>`;
          }
        }
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
    case "paragraph": {
      const styles = [];
      if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`);
      if (node.attrs?.lineHeight) styles.push(`line-height: ${node.attrs.lineHeight}`);
      if (styles.length > 0) {
        return `<p style="${styles.join("; ")}">${contentText}</p>`;
      }
      return contentText;
    }
    case "heading": {
      const level = node.attrs?.level || 1;
      const styles = [];
      if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`);
      if (node.attrs?.lineHeight) styles.push(`line-height: ${node.attrs.lineHeight}`);
      if (styles.length > 0) {
        return `<h${level} style="${styles.join("; ")}">${contentText}</h${level}>`;
      }
      return `${"#".repeat(level)} ${contentText}`;
    }
    case "blockquote":
      return `> ${contentText}`;
    case "codeBlock":
      return `\`\`\`\n${contentText.replace(/^\n+|\n+$/g, "")}\n\`\`\``;
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
    case "table":
      return `<table><tbody>${contentText}</tbody></table>`;
    case "tableRow":
      return `<tr>${contentText}</tr>`;
    case "tableHeader":
      return `<th>${contentText}</th>`;
    case "tableCell":
      return `<td>${contentText}</td>`;
    case "image": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      const width = node.attrs?.width || "100%";
      if (width && width !== "100%") {
        return `<img src="${src}" alt="${alt}" width="${width}" />`;
      }
      return `![${alt}](${src})`;
    }
    case "imageResize": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      const width = node.attrs?.width || "";
      if (width) {
        return `<img src="${src}" alt="${alt}" width="${width}" />`;
      }
      return `![${alt}](${src})`;
    }
    case "figure": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      const width = node.attrs?.width || "";
      const captionText = Array.isArray(node.content) ? node.content.map(tiptapToMarkdown).join("") : "";
      if (width) {
        return `<figure>\n  <img src="${src}" alt="${alt}" width="${width}" />\n  <figcaption>${captionText}</figcaption>\n</figure>`;
      }
      return `<figure>\n  <img src="${src}" alt="${alt}" />\n  <figcaption>${captionText}</figcaption>\n</figure>`;
    }
    case "figcaption": {
      return contentText;
    }
    default:
      return contentText;
  }
};

// Recursive helper to translate Tiptap JSON schema structure to HTML
const tiptapJSONToHTML = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (node.type === "text") {
    let text = node.text || "";
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "strike") text = `<s>${text}</s>`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "code") text = `<code>${text}</code>`;
        if (mark.type === "subscript") text = `<sub>${text}</sub>`;
        if (mark.type === "superscript") text = `<sup>${text}</sup>`;
        if (mark.type === "link") text = `<a href="${mark.attrs?.href || ""}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        if (mark.type === "highlight") {
          const color = mark.attrs?.color || "#ffeb3b";
          text = `<mark style="background-color: ${color}">${text}</mark>`;
        }
        if (mark.type === "textStyle") {
          const styles = [];
          if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`);
          if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`);
          if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`);
          if (mark.attrs?.lineHeight) styles.push(`line-height: ${mark.attrs.lineHeight}`);
          if (mark.attrs?.textCase) {
            const transform = mark.attrs.textCase === "uppercase" ? "uppercase" : 
                              mark.attrs.textCase === "lowercase" ? "lowercase" : 
                              mark.attrs.textCase === "capitalize" ? "capitalize" : "none";
            styles.push(`text-transform: ${transform}`);
          }
          if (styles.length > 0) {
            text = `<span style="${styles.join("; ")}">${text}</span>`;
          }
        }
      });
    }
    return text;
  }

  const contentHTML = Array.isArray(node.content)
    ? node.content.map(tiptapJSONToHTML).join("")
    : "";

  switch (node.type) {
    case "doc":
      return contentHTML;
    case "paragraph": {
      const styles = [];
      if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`);
      if (node.attrs?.lineHeight) styles.push(`line-height: ${node.attrs.lineHeight}`);
      const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
      return `<p${styleAttr}>${contentHTML}</p>`;
    }
    case "heading": {
      const level = node.attrs?.level || 1;
      const styles = [];
      if (node.attrs?.textAlign) styles.push(`text-align: ${node.attrs.textAlign}`);
      if (node.attrs?.lineHeight) styles.push(`line-height: ${node.attrs.lineHeight}`);
      const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
      return `<h${level}${styleAttr}>${contentHTML}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${contentHTML}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${contentHTML}</code></pre>`;
    case "bulletList":
      return `<ul>${contentHTML}</ul>`;
    case "orderedList":
      return `<ol>${contentHTML}</ol>`;
    case "listItem":
      return `<li>${contentHTML}</li>`;
    case "taskList":
      return `<ul data-type="taskList" style="list-style-type: none; padding-left: 0.5rem; margin-left: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">${contentHTML}</ul>`;
    case "taskItem": {
      const checked = !!node.attrs?.checked;
      const textStyle = checked ? ' style="text-decoration: line-through; color: #8e8e93;"' : "";
      const checkIcon = checked 
        ? `<span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.5px solid #0ea98a; border-radius: 3px; background-color: #0ea98a; margin-top: 4px; flex-shrink: 0; vertical-align: middle;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>`
        : `<span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.5px solid #a0aec0; border-radius: 3px; background-color: transparent; margin-top: 4px; flex-shrink: 0; vertical-align: middle;"></span>`;
      return `<li style="display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.4rem; list-style-type: none;">${checkIcon} <span${textStyle}>${contentHTML}</span></li>`;
    }
    case "horizontalRule":
      return "<hr />";
    case "table":
      return `<table><tbody>${contentHTML}</tbody></table>`;
    case "tableRow":
      return `<tr>${contentHTML}</tr>`;
    case "tableHeader":
      return `<th>${contentHTML}</th>`;
    case "tableCell":
      return `<td>${contentHTML}</td>`;
    case "image": {
      const widthVal = node.attrs?.width || "100%";
      return `<img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" title="${node.attrs?.title || ""}" style="width: ${widthVal}; max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1rem auto;" />`;
    }
    case "imageResize": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      const title = node.attrs?.title || "";
      const containerStyle = node.attrs?.containerStyle || "";
      const wrapperStyle = node.attrs?.wrapperStyle || "";
      return `<div style="${wrapperStyle}"><div style="${containerStyle}"><img src="${src}" alt="${alt}" title="${title}" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0;" /></div></div>`;
    }
    case "figure": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      const title = node.attrs?.title || "";
      const containerStyle = node.attrs?.containerStyle || "";
      const wrapperStyle = node.attrs?.wrapperStyle || "";
      return `<figure style="${wrapperStyle}"><div style="${containerStyle}"><img src="${src}" alt="${alt}" title="${title}" style="max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0;" />${contentHTML}</div></figure>`;
    }
    case "figcaption": {
      return `<figcaption style="text-align: center; font-size: 0.9em; color: #555555; margin-top: 4px;">${contentHTML}</figcaption>`;
    }
    default:
      return contentHTML;
  }
};

// Safe helper to compile page content to HTML (supports raw HTML strings, stringified JSON, and JSON objects)
const getPageHTMLContent = (content) => {
  if (!content) return "";
  if (typeof content === "object") {
    return tiptapJSONToHTML(content);
  }
  try {
    const json = JSON.parse(content);
    return tiptapJSONToHTML(json);
  } catch (e) {
    // Already HTML or plain text: return it directly
    return content;
  }
};

// Safe helper to compile page content to Markdown
const getPageMarkdownContent = (content) => {
  if (!content) return "";
  if (typeof content === "object") {
    return tiptapToMarkdown(content);
  }
  try {
    const json = JSON.parse(content);
    return tiptapToMarkdown(json);
  } catch (e) {
    // If not JSON, it's HTML. Convert HTML structure to Markdown.
    return htmlToMarkdown(content);
  }
};

// Safe helper to compile page content to plain text
const getPageTextContent = (content) => {
  if (!content) return "";
  if (typeof content === "object") {
    return getTextFromTiptapJSON(content);
  }
  try {
    const json = JSON.parse(content);
    return getTextFromTiptapJSON(json);
  } catch (e) {
    // If not JSON, strip HTML tags
    return content.replace(/<[^>]*>/g, " ");
  }
};


const fetchNotebooksList = async () => {
  const { data } = await api.get("/notebooks");
  return data;
};

const fetchNotebookPages = async ({ queryKey }) => {
  const [_, notebookId] = queryKey;
  const { data } = await api.get(`/notebooks/${notebookId}/pages`);
  return data;
};

const NotebookWorkspace = () => {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guardAction, isGhost } = useGhostGuard();

  const [activePage, setActivePage] = useState(null);
  const [title, setTitle]         = useState("");
  const [content, setContent]     = useState(null);
  const [creating, setCreating]   = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelectedPageIds, setExportSelectedPageIds] = useState([]);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  // Avoid firing a save on the very first render / page switch
  const skipNextSave = useRef(true);
  const pageIdRef = useRef(null);

  const openPage = (page) => {
    skipNextSave.current = true;
    pageIdRef.current = page._id;
    setActivePage(page);
    setTitle(page.title);
    setContent(page.content);
    setSidebarOpen(false);
  };

  const { data: serverNotebooks = [] } = useQuery({
    queryKey: ["notebooks"],
    queryFn: fetchNotebooksList,
    enabled: !isGhost,
  });
  const notebooks = isGhost ? GHOST_NOTEBOOKS : serverNotebooks;
  const notebook = notebooks.find((n) => n._id === notebookId) || null;

  const { data: serverPages = [], isLoading: loading } = useQuery({
    queryKey: ["notebookPages", notebookId],
    queryFn: fetchNotebookPages,
    enabled: !isGhost,
  });
  const pages = isGhost ? (GHOST_PAGES[notebookId] || []) : serverPages;

  // Set the active page on first load
  useEffect(() => {
    if (pages.length > 0 && !activePage) {
      openPage(pages[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, activePage]);

  const handleCreatePage = () => {
    setShowTemplateModal(true);
  };

  const handleTemplateSelect = async (template) => {
    guardAction(async () => {
      setCreating(true);
      try {
        const templateTitle = template.title || "Untitled";
        
        // 1. Create a page with the template title
        const { data } = await api.post(`/notebooks/${notebookId}/pages`, { 
          title: templateTitle
        });
        
        // 2. Open the page but bypass skipNextSave.current so it autosaves content
        skipNextSave.current = false;
        pageIdRef.current = data._id;
        setActivePage(data);
        setTitle(templateTitle);
        
        // Convert Markdown template to Tiptap HTML content (using parseMarkdownFile)
        let pageHtml = "";
        if (template.id !== "blank" && template.content) {
          const parsed = parseMarkdownFile(template.content);
          pageHtml = parsed.html || "";
        }
        setContent(pageHtml);
        
        // Invalidate query to sync sidebar
        await queryClient.invalidateQueries({ queryKey: ["notebookPages", notebookId] });
        queryClient.invalidateQueries({ queryKey: ["notebooks"] });
        setSidebarOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to create page from template.");
      } finally {
        setCreating(false);
      }
    });
  };

  const handleImportMarkdown = async (fileContent, fileName) => {
    guardAction(async () => {
      setCreating(true);
      try {
        const parsed = parseMarkdownFile(fileContent);
        const parsedTitle = parsed.title || fileName.replace(/\.md$/i, "");
        
        const { data } = await api.post(`/notebooks/${notebookId}/pages`, { 
          title: parsedTitle
        });
        
        skipNextSave.current = false;
        pageIdRef.current = data._id;
        setActivePage(data);
        setTitle(parsedTitle);
        setContent(parsed.html || "");
        
        await queryClient.invalidateQueries({ queryKey: ["notebookPages", notebookId] });
        queryClient.invalidateQueries({ queryKey: ["notebooks"] });
        
        toast.success(`Imported "${fileName}" successfully!`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to import Markdown file.");
      } finally {
        setCreating(false);
      }
    });
  };

  const handleDeletePage = (page) => {
    showConfirm({
      title: "Move Page to Trash?",
      message: `Are you sure you want to move the page "${page.title || "Untitled"}" to the trash?`,
      confirmLabel: "Move to Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        const isActive = activePage?._id === page._id;
        if (isActive) {
          skipNextSave.current = true;
          const remaining = pages.filter((p) => p._id !== page._id);
          if (remaining.length > 0) {
            const nextPage = remaining[0];
            pageIdRef.current = nextPage._id;
            setActivePage(nextPage);
            setTitle(nextPage.title || "");
            setContent(nextPage.content || "");
          } else {
            setActivePage(null);
            setTitle("");
            setContent(null);
            pageIdRef.current = null;
          }
        }
        guardAction(async () => {
          try {
            await api.delete(`/pages/${page._id}`);
            await queryClient.invalidateQueries({ queryKey: ["notebookPages", notebookId] });
            queryClient.invalidateQueries({ queryKey: ["notebooks"] });
            toast.success("Page moved to trash successfully!");
          } catch (error) {
            toast.error("Failed to delete page.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleTitleChange = (newTitle) => {
    if (isGhost) return; // Prevent changing local state titles in ghost mode
    setTitle(newTitle);
    if (activePage) {
      setActivePage((prev) => (prev ? { ...prev, title: newTitle } : null));
      queryClient.setQueryData(["notebookPages", notebookId], (oldPages) =>
        oldPages ? oldPages.map((p) => (p._id === activePage._id ? { ...p, title: newTitle } : p)) : []
      );
    }
  };

  /* ── Autosave: debounce title + content changes, PUT when settled ── */
  const debouncedTitle   = useDebounce(title, 600);
  const debouncedContent = useDebounce(content, 800);

  useEffect(() => {
    if (isGhost) return; // Autosave disabled in ghost mode
    if (!activePage) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }

    const pageIdToSave = pageIdRef.current;
    if (!pageIdToSave) return;

    const save = async () => {
      setSaveState("saving");
      try {
        const { data } = await api.put(`/pages/${pageIdToSave}`, {
          title:   debouncedTitle || "Untitled",
          content: debouncedContent,
        });
        queryClient.setQueryData(["notebookPages", notebookId], (oldPages) =>
          oldPages ? oldPages.map((p) => (p._id === data._id ? data : p)) : []
        );
        setActivePage((current) => (current?._id === data._id ? data : current));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("idle");
      }
    };
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedContent, isGhost]);

  // Emoji handler triggers
  const selectEmoji = async (emoji) => {
    guardAction(async () => {
      if (!activePage) return;
      const updatedPage = { ...activePage, icon: emoji };
      setActivePage(updatedPage);
      queryClient.setQueryData(["notebookPages", notebookId], (oldPages) =>
        oldPages ? oldPages.map((p) => (p._id === activePage._id ? updatedPage : p)) : []
      );
      await api.put(`/pages/${activePage._id}`, { icon: emoji });
    });
  };

  const removeEmoji = async () => {
    guardAction(async () => {
      if (!activePage) return;
      const updatedPage = { ...activePage, icon: "" };
      setActivePage(updatedPage);
      queryClient.setQueryData(["notebookPages", notebookId], (oldPages) =>
        oldPages ? oldPages.map((p) => (p._id === activePage._id ? updatedPage : p)) : []
      );
      await api.put(`/pages/${activePage._id}`, { icon: "" });
    });
  };



  // Consolidated Multi-format single/multi-page exporter
  const handleExecuteExport = () => {
    if (!notebook || !pages.length) return;
    const selectedPages = pages.filter((page) => exportSelectedPageIds.includes(page._id));
    if (!selectedPages.length) {
      toast.error("No pages selected for export!");
      return;
    }

    const triggerDownload = (text, mimeType, extension) => {
      const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const slug = notebook.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "notebook";
      link.download = `${slug}-export.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Notebook exported as ${extension.toUpperCase()}!`);
      setIsExportModalOpen(false);
    };

    if (exportFormat === "pdf") {
      const printContainer = document.createElement("div");
      printContainer.id = "print-media-container";

      const coverPageHTML = includeCoverPage ? `
        <div class="print-cover-page">
          <h1 class="print-cover-title">${notebook.name}</h1>
          <p class="print-cover-subtitle">Compiled Document</p>
          <p class="print-cover-date">
            Exported on ${new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      ` : "";

      const pagesHTML = selectedPages.map((page, idx) => `
        <div class="print-page-section" style="${!includeCoverPage && idx === 0 ? 'page-break-before: avoid; break-before: avoid;' : ''}">
          <h2 class="print-page-title">${page.title || "Untitled"}</h2>
          <div class="print-page-content document-editor-content">
            ${page.content ? getPageHTMLContent(page.content) : ""}
          </div>
        </div>
      `).join("");

      printContainer.innerHTML = coverPageHTML + pagesHTML;
      document.body.appendChild(printContainer);

      setTimeout(() => {
        window.print();
        document.body.removeChild(printContainer);
        setIsExportModalOpen(false);
        toast.success("Notebook compiled to PDF!");
      }, 300);
    } 
    else if (exportFormat === "md") {
      let mdContent = "";
      if (includeCoverPage) {
        mdContent += `# ${notebook.name}\nExported on ${new Date().toLocaleDateString()}\n\n---\n\n`;
      }
      selectedPages.forEach(page => {
        const titleText = page.title || "Untitled Page";
        const body = page.content ? getPageMarkdownContent(page.content) : "";
        mdContent += `# ${titleText}\n\n${body}\n\n---\n\n`;
      });
      triggerDownload(mdContent, "text/markdown", "md");
    } 
    else if (exportFormat === "html") {
      let htmlBody = "";
      if (includeCoverPage) {
        htmlBody += `<div class="cover-page" style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;"><h1>${notebook.name}</h1><p>Exported on ${new Date().toLocaleDateString()}</p></div>`;
      }
      selectedPages.forEach((page, idx) => {
        const titleText = page.title || "Untitled Page";
        const body = page.content ? getPageHTMLContent(page.content) : "";
        const breakStyle = !includeCoverPage && idx === 0 ? "" : 'page-break-before: always;';
        htmlBody += `<article class="page-section" style="${breakStyle} margin-top: 2rem; border-top: 1px solid #eee; padding-top: 2rem;"><h1>${titleText}</h1>${body}</article>`;
      });

      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${notebook.name}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
      h1 { color: #0ea98a; }
      pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: monospace; }
      code { font-family: monospace; background: #f8fafc; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #e2e8f0; }
      blockquote { border-left: 4px solid #0ea98a; margin: 1.5rem 0; padding-left: 1rem; color: #555; font-style: italic; }
      table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; table-layout: fixed; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; vertical-align: top; box-sizing: border-box; }
      th { background-color: #f8fafc; font-weight: 600; }
      mark { background-color: #ffeb3b; padding: 0.12rem 0.25rem; border-radius: 4px; color: #1a1a1a; }
      img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1rem auto; }
      div:has(> div > img),
      figure:has(> div > img) {
        margin: 1.5rem 0 !important;
      }
      div[style*="display: flex"],
      figure[style*="display: flex"] {
        justify-content: center !important;
      }
      @media print {
        .page-section { page-break-before: always; }
      }
    </style>
  </head>
  <body>
    ${htmlBody}
  </body>
</html>`;
      triggerDownload(htmlContent, "text/html", "html");
    } 
    else if (exportFormat === "txt") {
      let txtContent = "";
      if (includeCoverPage) {
        txtContent += `${notebook.name}\nExported on ${new Date().toLocaleString()}\n\n========================================\n\n`;
      }
      selectedPages.forEach(page => {
        const titleText = page.title || "Untitled Page";
        const body = page.content ? getPageTextContent(page.content) : "";
        txtContent += `Page: ${titleText}\n----------------------------------------\n${body}\n\n`;
      });
      triggerDownload(txtContent, "text/plain", "txt");
    } 
    else if (exportFormat === "json") {
      const jsonObject = {
        notebook: notebook.name,
        exportedAt: new Date().toISOString(),
        pages: selectedPages.map(page => ({
          title: page.title,
          content: page.content ? (typeof page.content === "string" ? JSON.parse(page.content) : page.content) : null
        }))
      };
      triggerDownload(JSON.stringify(jsonObject, null, 2), "application/json", "json");
    }
  };

  // Count words and chars dynamically
  const getStats = () => {
    if (!content) return { words: 0, chars: 0 };
    const text = getPageTextContent(content).trim();
    if (!text) return { words: 0, chars: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    return { words, chars };
  };

  if (loading) {
    return (
      <div className="notebook-workspace">
        <aside className="page-sidebar skeleton-loader" style={{ width: "190px", height: "100%" }}></aside>
        <div className="document-pane" style={{ padding: "2rem" }}>
          <div className="skeleton-loader" style={{ height: "40px", width: "40%", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}></div>
          <div className="skeleton-loader" style={{ flex: 1, borderRadius: "var(--radius-md)", minHeight: "300px" }}></div>
        </div>
      </div>
    );
  }

  const { words, chars } = getStats();

  if (!notebook) {
    return (
      <div className="empty-state">
        <i className="fa-regular fa-folder-open"></i>
        <p>Notebook not found.</p>
        <Button variant="secondary" size="sm" style={{ marginTop: "1rem" }} onClick={() => navigate("/notebooks")}>
          Back to notebooks
        </Button>
      </div>
    );
  }

  return (
    <div className={`notebook-workspace${sidebarOpen ? " sidebar-open" : ""}`}>
      <PageSidebar
        notebookName={notebook?.name}
        pages={pages}
        activePageId={activePage?._id}
        activePage={activePage}
        title={title}
        onTitleChange={handleTitleChange}
        onSelect={openPage}
        onCreate={handleCreatePage}
        onDelete={handleDeletePage}
        onExport={() => {
          setExportSelectedPageIds(pages.map((p) => p._id));
          setIsExportModalOpen(true);
        }}
        onEmojiSelect={selectEmoji}
        onEmojiRemove={removeEmoji}
        creating={creating}
        onImportMarkdown={handleImportMarkdown}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <div className="document-pane">
        {/* Mobile Header Bar */}
        <div className="workspace-mobile-header">
          <button 
            type="button" 
            className="workspace-toggle-sidebar-btn" 
            onClick={() => setSidebarOpen(true)}
            title="Open pages sidebar"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <span className="workspace-mobile-title">
            {activePage ? activePage.title || "Untitled" : notebook?.name}
          </span>
          <button 
            type="button" 
            className="workspace-back-to-notebooks-btn" 
            onClick={() => navigate("/notebooks")}
            title="Back to notebooks"
          >
            <i className="fa-solid fa-folder-open"></i>
          </button>
        </div>

        {activePage ? (
          <>
            <DocumentEditor value={content} onChange={setContent} editable={!isGhost} />
            <div className="document-pane-footer">
              {/* Save status at the left */}
              <span className="document-stat">
                {saveState === "saving" && (
                  <span className="saving-spinner-text">
                    <span className="saving-pulse"></span>
                    Saving...
                  </span>
                )}
                {saveState === "saved" && <span className="save-success">Saved ✓</span>}
                {saveState === "idle" && <span style={{ color: "var(--text-muted)" }}>All changes saved</span>}
              </span>
              <span className="document-stat-divider">|</span>
              <span className="document-stat">{words} word{words === 1 ? "" : "s"}</span>
              <span className="document-stat-divider">|</span>
              <span className="document-stat">{chars} character{chars === 1 ? "" : "s"}</span>
            </div>
            <FloatingAIIcon 
              value={content} 
              onUpdateContent={setContent} 
              contentType="tiptap" 
            />
          </>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <i className="fa-regular fa-file-lines"></i>
            <p>No pages yet. Create one to start writing.</p>
            <Button variant="primary" size="sm" style={{ marginTop: "1rem" }} onClick={handleCreatePage}>
              New page
            </Button>
          </div>
        )}
      </div>

      {sidebarOpen && (
        <div className="workspace-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {isExportModalOpen && (
        <Modal
          title="Export Pages"
          onClose={() => setIsExportModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={exportSelectedPageIds.length === 0}
                onClick={handleExecuteExport}
              >
                Export {exportFormat.toUpperCase()} ({exportSelectedPageIds.length})
              </Button>
            </>
          }
        >
          <div className="export-modal-content">
            <p className="export-modal-description" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Select which pages from the notebook <strong>{notebook?.name}</strong> you want to export.
            </p>

            <div className="field-group" style={{ marginBottom: "1.25rem" }}>
              <label className="field-label" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>Export Format</label>
              <select 
                className="input" 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="md">Markdown Compiler (.md)</option>
                <option value="html">HTML Compiler (.html)</option>
                <option value="txt">Plain Text (.txt)</option>
                <option value="json">Raw JSON (.json)</option>
              </select>
            </div>

            <div className="export-modal-options" style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none", color: "var(--text-primary)", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={(e) => setIncludeCoverPage(e.target.checked)}
                  style={{
                    appearance: "checkbox",
                    width: "auto",
                    height: "auto",
                    cursor: "pointer",
                  }}
                />
                <span>Include cover page with Notebook title</span>
              </label>
            </div>

            <div className="export-select-all-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "0.75rem" }}>
              <button
                type="button"
                className="export-select-all-btn"
                onClick={() => {
                  if (exportSelectedPageIds.length === pages.length) {
                    setExportSelectedPageIds([]);
                  } else {
                    setExportSelectedPageIds(pages.map(p => p._id));
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                <i className={exportSelectedPageIds.length === pages.length ? "fa-solid fa-square-check" : "fa-regular fa-square"} style={{ color: exportSelectedPageIds.length === pages.length ? "var(--accent-teal)" : "var(--text-muted)", fontSize: "1rem" }}></i>
                <span>Select All ({pages.length} pages)</span>
              </button>
            </div>

            <div className="export-pages-list scrollbar-custom" style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingRight: "4px" }}>
              {pages.map((page) => {
                const isPageSelected = exportSelectedPageIds.includes(page._id);
                return (
                  <div
                    key={page._id}
                    className={`export-page-item${isPageSelected ? " selected" : ""}`}
                    onClick={() => {
                      setExportSelectedPageIds((prev) =>
                        prev.includes(page._id)
                          ? prev.filter((id) => id !== page._id)
                          : [...prev, page._id]
                      );
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: isPageSelected ? "var(--bg-hover)" : "transparent"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPageSelected}
                      readOnly
                      style={{
                        appearance: "checkbox",
                        width: "auto",
                        height: "auto",
                        cursor: "pointer",
                        margin: 0,
                      }}
                    />
                    {page.icon && <span style={{ fontSize: "1.1rem" }}>{page.icon}</span>}
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      {page.title || "Untitled"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      <TemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default NotebookWorkspace;