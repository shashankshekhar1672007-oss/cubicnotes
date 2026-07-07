import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { parseMarkdown } from "../../utils/parseMarkdown";
import { timeAgo } from "../../utils/formatDate";
import "../../assets/styles/components/note-card.css";

/**
 * Premium nested note card.
 * Outer container displays a soft pastel background matching the accent.
 * Inner container is white (or dark surface) and contains tags, title, and rich content preview.
 */
const NoteCard = ({
  note,
  onClick,
  onEdit,
  onTogglePin,
  onDelete,
  onNewNote,
  style,
  isSelected,
  onToggleSelect,
  selectionActive,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef(null);

  const [pressTimer, setPressTimer] = useState(null);
  const isLongPress = useRef(false);
  const ignoreNextClick = useRef(false);

  const handleTouchStart = (e) => {
    isLongPress.current = false;
    const timer = setTimeout(() => {
      isLongPress.current = true;
      ignoreNextClick.current = true;
      onToggleSelect(note._id);
    }, 600);
    setPressTimer(timer);
  };

  const handleTouchEnd = (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (isLongPress.current) {
      setTimeout(() => {
        ignoreNextClick.current = false;
      }, 300);
    }
  };

  const handleCancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  useEffect(() => {
    if (!showMenu) {
      setShowExportMenu(false);
      return;
    }
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const stop = (e, fn) => {
    e.stopPropagation();
    fn?.();
  };

  const handleMenuClick = (e, action) => {
    e.stopPropagation();
    setShowMenu(false);
    action?.();
  };

  const triggerDownload = (text, mimeType, extension) => {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = (note.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "untitled";
    link.download = `${slug}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Note exported as ${extension.toUpperCase()}!`);
  };

  const exportMarkdown = () => {
    const title = note.title || "Untitled";
    const content = note.content || "";
    const subheading = note.subheading || "";
    const tags = note.tags || [];
    const metadata = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nsubheading: "${subheading.replace(/"/g, '\\"')}"\ntags: ${JSON.stringify(tags)}\ndate: "${new Date().toISOString()}"\n---\n\n`;
    const markdownText = metadata + content;
    triggerDownload(markdownText, "text/markdown", "md");
  };

  const exportHTML = () => {
    const title = note.title || "Untitled";
    const content = note.content || "";
    const subheading = note.subheading || "";
    const tags = note.tags || [];
    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
      .note-header { border-bottom: 2px solid #0ea98a; padding-bottom: 1rem; margin-bottom: 2rem; }
      .note-title { font-size: 2.25rem; margin: 0; color: #1a1a1a; }
      .note-subheading { font-size: 1.25rem; color: #666; margin: 0.5rem 0 0; }
      .tags { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
      .tag { background: #f0f0f0; border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.85rem; color: #555; }
      .note-body { font-size: 1.1rem; }
      pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: monospace; }
      code { font-family: monospace; background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 4px; }
      blockquote { border-left: 4px solid #0ea98a; margin: 1.5rem 0; padding-left: 1rem; color: #555; font-style: italic; }
    </style>
  </head>
  <body>
    <header class="note-header">
      <h1 class="note-title">${title}</h1>
      ${subheading ? `<h2 class="note-subheading">${subheading}</h2>` : ""}
      ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">#${t}</span>`).join(" ")}</div>` : ""}
    </header>
    <main class="note-body">
      ${parseMarkdown(content)}
    </main>
  </body>
</html>`;
    triggerDownload(htmlContent, "text/html", "html");
  };

  const exportTXT = () => {
    const title = note.title || "Untitled";
    const content = note.content || "";
    const subheading = note.subheading || "";
    const tags = note.tags || [];
    const textContent = `Title: ${title}\nSubheading: ${subheading}\nTags: ${tags.join(", ")}\nDate: ${new Date().toLocaleString()}\n\n========================================\n\n${content}`;
    triggerDownload(textContent, "text/plain", "txt");
  };

  const exportJSON = () => {
    const jsonObject = {
      title: note.title || "Untitled",
      subheading: note.subheading || "",
      content: note.content || "",
      tags: note.tags || [],
      accent: note.accent || "",
      exportedAt: new Date().toISOString()
    };
    triggerDownload(JSON.stringify(jsonObject, null, 2), "application/json", "json");
  };

  const exportPDF = () => {
    const title = note.title || "Untitled";
    const content = note.content || "";
    const subheading = note.subheading || "";
    const tags = note.tags || [];
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlString = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1d1d1f; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            .note-header { border-bottom: 2px solid #0ea98a; padding-bottom: 1rem; margin-bottom: 2rem; }
            .note-title { font-size: 2.2rem; margin: 0 0 0.5rem 0; font-weight: 700; color: #1d1d1f; }
            .note-subheading { font-size: 1.2rem; color: #8e8e93; margin: 0 0 1rem 0; font-weight: 400; }
            .note-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
            .tag { background: #f4f4f4; border: 1px solid #e5e5e5; border-radius: 4px; padding: 0.15rem 0.5rem; font-size: 0.8rem; color: #515154; font-family: monospace; }
            .note-content { font-size: 1.05rem; }
            h1 { font-size: 2.0rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #0ea98a; }
            h2 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
            h3 { font-size: 1.2rem; margin-top: 1.25rem; margin-bottom: 0.5rem; }
            pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 0.9rem; }
            code { font-family: monospace; background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; }
            blockquote { border-left: 4px solid #0ea98a; padding-left: 1rem; color: #515154; margin: 1rem 0; font-style: italic; }
            ul { list-style-type: disc; padding-left: 1.5rem; margin: 1rem 0; }
            ol { list-style-type: decimal; padding-left: 1.5rem; margin: 1rem 0; }
            li { margin-bottom: 0.25rem; }
            a { color: #0ea98a; text-decoration: underline; }
            @media print {
              body { padding: 0; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="note-header">
            <h1 class="note-title">${title}</h1>
            ${subheading ? '<h2 class="note-subheading">' + subheading + '</h2>' : ""}
            ${tags.length ? '<div class="note-tags">' + tags.map(t => '<span class="tag">#' + t + '</span>').join("") + '</div>' : ""}
          </div>
          <div class="note-content">
            ${parseMarkdown(content)}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlString);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    toast.success("Note compiled to PDF!");
  };

  const contentHTML = parseMarkdown(note.content);

  return (
    <div
      className={`note-card-grid${isSelected ? " selected" : ""}`}
      style={{ "--card-accent": note.accent || "var(--accent-teal)", ...style }}
      onTouchStart={onToggleSelect ? handleTouchStart : undefined}
      onTouchEnd={onToggleSelect ? handleTouchEnd : undefined}
      onTouchMove={onToggleSelect ? handleCancelPress : undefined}
      onMouseDown={onToggleSelect ? handleTouchStart : undefined}
      onMouseUp={onToggleSelect ? handleTouchEnd : undefined}
      onMouseMove={onToggleSelect ? handleCancelPress : undefined}
      onClick={(e) => {
        if (onToggleSelect) {
          if (ignoreNextClick.current) {
            ignoreNextClick.current = false;
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (selectionActive) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(note._id);
          }
        }
      }}
    >
      {/* Outer Header */}
      <div className="ncg-outer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onToggleSelect && (
            <div className="trash-checkbox-container" style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                className="trash-checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(note._id)}
              />
            </div>
          )}
          <span className="ncg-category" title={note.title}>{note.title}</span>
        </div>
        <div className="ncg-outer-actions">
          <div className="ncg-menu-container" ref={menuRef}>
            <button
              type="button"
              className="ncg-outer-btn"
              title="More actions"
              onClick={(e) => stop(e, () => setShowMenu(!showMenu))}
            >
              <i className="fa-solid fa-ellipsis"></i>
            </button>
            {showMenu && (
              <div className="ncg-dropdown-menu">
                {showExportMenu ? (
                  <>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => { e.stopPropagation(); setShowExportMenu(false); }}
                      style={{ fontWeight: 600, borderBottom: "1px solid var(--border)", marginBottom: "4px" }}
                    >
                      <i className="fa-solid fa-arrow-left"></i> Back
                    </button>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, exportPDF)}
                    >
                      <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444' }}></i> PDF Document
                    </button>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, exportMarkdown)}
                    >
                      <i className="fa-solid fa-file-code" style={{ color: '#0ea98a' }}></i> Markdown (.md)
                    </button>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, exportHTML)}
                    >
                      <i className="fa-solid fa-file-lines" style={{ color: '#3b82f6' }}></i> HTML Document
                    </button>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, exportTXT)}
                    >
                      <i className="fa-solid fa-file-text" style={{ color: '#6b7280' }}></i> Plain Text (.txt)
                    </button>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, exportJSON)}
                    >
                      <i className="fa-solid fa-code" style={{ color: '#f59e0b' }}></i> Raw JSON (.json)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => handleMenuClick(e, onEdit)}
                    >
                      <i className="fa-solid fa-pen"></i> Edit Note
                    </button>
                    {onTogglePin && (
                      <button
                        type="button"
                        className="ncg-dropdown-item"
                        onClick={(e) => handleMenuClick(e, onTogglePin)}
                      >
                        <i className="fa-solid fa-thumbtack"></i> {note.isPinned ? "Unpin Note" : "Pin Note"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="ncg-dropdown-item"
                      onClick={(e) => { e.stopPropagation(); setShowExportMenu(true); }}
                    >
                      <i className="fa-solid fa-file-export"></i> Export <i className="fa-solid fa-caret-down" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}></i>
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        className="ncg-dropdown-item danger"
                        onClick={(e) => handleMenuClick(e, onDelete)}
                      >
                        <i className="fa-regular fa-trash-can"></i> Delete Note
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inner Card */}
      <div
        className="note-card-grid-inner"
        onClick={(e) => {
          if (selectionActive && onToggleSelect) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(note._id);
          } else {
            onClick(e);
          }
        }}
      >
        {/* Tags */}
        {note.tags?.length > 0 && (
          <div className="ncg-tags">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="ncg-tag">
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="ncg-tag ncg-tag-more" title={note.tags.slice(3).map(t => `#${t}`).join(', ')}>
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subheading (optional inner card heading) */}
        {note.subheading && (
          <h4 className="ncg-subheading" title={note.subheading}>
            {note.subheading}
          </h4>
        )}

        {/* Content Preview */}
        {note.content ? (
          <div
            className="ncg-preview"
            dangerouslySetInnerHTML={{ __html: contentHTML }}
          />
        ) : (
          <div className="ncg-preview empty">No content</div>
        )}

        {/* Footer */}
        <div className="ncg-inner-footer">
          <span className="ncg-date">{timeAgo(note.createdAt)}</span>
          {note.isPinned && (
            <span className="ncg-pinned-indicator" title="Pinned">
              <i className="fa-solid fa-thumbtack"></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
