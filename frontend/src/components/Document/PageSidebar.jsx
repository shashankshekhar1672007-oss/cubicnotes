import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../UI/Button";

const EMOJIS = [
  "📝","📄","📓","📔","📒","📕","📖","📑","📚",
  "✏️","✒️","🖊️","✍️","🖍️","🎨","🛠️",
  "📁","📂","🗂️","🗄️","📋",
  "0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟",
  "📌","🔖","🏷️","📎","🖇️","🔗",
  "💡","🧠","🎯","💬",
  "💻","📷","🖼️","🎤","🎧","🔍","🔎","🗺️","🧭",
  "📅","⏰","⏳","🔔","✅","🔒","🔑","🗑️",
  "🚀","🔥","🌟","✨","❤️",
];

/**
 * Page sidebar listing pages inside the currently open notebook.
 * Also hosts the active page's emoji, editable title, export button
 * and save indicator — these have been moved here from the document
 * pane header to maximise the editor's vertical writing space.
 */
const PageSidebar = ({
  notebookName,
  pages,
  activePageId,
  activePage,
  title,
  onTitleChange,
  onSelect,
  onCreate,
  onDelete,
  onExport,
  onExportPDF,
  onEmojiSelect,
  onEmojiRemove,
  creating,
  onImportMarkdown,
  onCloseSidebar,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery]       = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        onImportMarkdown?.(event.target.result, file.name);
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!exportDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportDropdownOpen]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".emoji-picker-container")) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showEmojiPicker]);

  const filteredPages = pages.filter((page) =>
    (page.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-sidebar">
      {/* ── Top: back + notebook name + new page ── */}
      <div className="page-sidebar-header">
        <Button
          variant="ghost"
          size="sm"
          className="page-sidebar-header-btn desktop-back-btn"
          onClick={() => navigate("/notebooks")}
          aria-label="Back to notebooks"
          title="Back to notebooks"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="page-sidebar-header-btn mobile-close-btn"
          onClick={onCloseSidebar}
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </Button>
        <div className="page-sidebar-title-container">
          <span className="page-sidebar-title" title={notebookName}>{notebookName}</span>
          <p className="page-subheading">Manage pages</p>
        </div>
      </div>

      {/* ── Active page meta (emoji + title) ── */}
      {activePage && (
        <div className="page-meta-panel">
          <div className="page-meta-emoji-row">
            <div className="emoji-picker-container">
              <button
                type="button"
                className="page-emoji-btn"
                onClick={() => setShowEmojiPicker((v) => !v)}
                title="Set page icon"
              >
                {activePage.icon
                  ? activePage.icon
                  : <i className="fa-regular fa-face-laugh"></i>}
              </button>
              {showEmojiPicker && (
                <div className="emoji-popover">
                  <div className="emoji-grid">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="emoji-grid-btn"
                        onClick={() => { onEmojiSelect(emoji); setShowEmojiPicker(false); }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {activePage.icon && (
                    <button
                      type="button"
                      className="emoji-clear-btn"
                      onClick={() => { onEmojiRemove(); setShowEmojiPicker(false); }}
                    >
                      Remove Emoji
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Editable page title alongside emoji */}
            <input
              className="page-meta-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled"
            />
          </div>
        </div>
      )}

      {/* ── Filter ── */}
      <div className="page-sidebar-search-container">
        <i className="fa-solid fa-magnifying-glass page-sidebar-search-icon"></i>
        <input
          type="text"
          className="page-sidebar-search-input"
          placeholder="Filter pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="page-sidebar-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="Clear filter"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      

      {/* ── Add Page Action ── */}
      <div className="page-sidebar-action-container">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreate}
          disabled={creating}
          icon="fa-solid fa-plus"
          style={{ width: "100%" }}
        >
          {creating ? "Adding page..." : "New Page"}
        </Button>
      </div>
        {/* ── Import Markdown Action ── */}
      <div className="page-sidebar-action-container" style={{ marginBottom: "0.25rem", paddingBottom: "0" }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept=".md" 
          onChange={handleFileChange} 
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          icon="fa-solid fa-file-import"
          style={{ width: "100%" }}
        >
          Import Markdown
        </Button>
      </div>
      {/* ── Page list ── */}
      <div className="page-sidebar-list scroll-thin">
        {filteredPages.length === 0 && (
          <div className="empty-state" style={{ padding: "2rem 0.5rem" }}>
            <i className="fa-regular fa-file"></i>
            <p>{searchQuery ? "No matches found." : "No pages yet."}</p>
          </div>
        )}
        {filteredPages.map((page) => (
          <div
            key={page._id}
            className={`page-sidebar-item${page._id === activePageId ? " active" : ""}`}
            onClick={() => onSelect(page)}
          >
            <span className="page-sidebar-icon">
              {page.icon || <i className="fa-regular fa-file-lines"></i>}
            </span>
            <span className="page-sidebar-name" title={page.title}>
              {page.title || "Untitled"}
            </span>
            <Button
              variant="danger"
              size="sm"
              className="page-sidebar-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(page); }}
              aria-label={`Delete ${page.title}`}
              title="Delete page"
            >
              <i className="fa-regular fa-trash-can"></i>
            </Button>
          </div>
        ))}
      </div>

      {/* ── Bottom: export button ── */}
      {pages.length > 0 && (
        <div className="page-sidebar-footer">
          <Button
            variant="primary"
            size="sm"
            onClick={onExport}
            icon="fa-solid fa-file-export"
            title="Export notebook pages"
            style={{ width: "100%" }}
          >
            Export Pages
          </Button>
        </div>
      )}
    </div>
  );
};

export default PageSidebar;