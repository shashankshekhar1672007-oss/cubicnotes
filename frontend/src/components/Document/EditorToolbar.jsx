import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Shared fixed-popover hook ─────────────────────────────────────────── */
/**
 * All popovers render position:fixed using a screen rect captured from the
 * trigger button. This sidesteps the overflow-x:auto clipping that was
 * causing them to render behind the editor content.
 */
const useFixedPopover = (isOpen, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, onClose]);
  return ref;
};

/* ─── Primitives ─────────────────────────────────────────────────────────── */
const Btn = ({ onClick, active, disabled, icon, label, children, style }) => (
  <button
    type="button"
    className={`editor-toolbar-btn${active ? " active" : ""}`}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    style={style}
  >
    {icon ? <i className={icon}></i> : children}
  </button>
);

const Divider = () => <span className="editor-toolbar-divider" />;

/* ─── Palettes ───────────────────────────────────────────────────────────── */
const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Teal",    value: "#0ea98a" },
  { label: "Purple",  value: "#7c6cf0" },
  { label: "Amber",   value: "#e09417" },
  { label: "Coral",   value: "#e85555" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Pink",    value: "#e85db4" },
  { label: "Lime",    value: "#8cb83a" },
  { label: "Cyan",    value: "#16b0d9" },
  { label: "Gray",    value: "#888884" },
  { label: "Black",   value: "#1a1a1a" },
  { label: "White",   value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fdf08a" },
  { label: "Green",  value: "#bdf2bd" },
  { label: "Blue",   value: "#bfe0fb" },
  { label: "Pink",   value: "#fbcfe8" },
  { label: "Orange", value: "#fde2b8" },
  { label: "Purple", value: "#ddd6fe" },
  { label: "Red",    value: "#fecaca" },
  { label: "Teal",   value: "#99f6e4" },
];

const FONT_SIZES = ["10px","11px","12px","13px","14px","16px","18px","20px","24px","28px","32px","36px","48px","64px"];

const FONT_FAMILIES = [
  { label: "Default",       value: null },
  { label: "Inter",         value: "Inter, sans-serif" },
  { label: "Georgia",       value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Courier New",   value: "'Courier New', monospace" },
  { label: "Arial",         value: "Arial, sans-serif" },
  { label: "Trebuchet MS",  value: "'Trebuchet MS', sans-serif" },
];

const LINE_HEIGHTS = [
  { label: "1.0 — Tight",    value: "1" },
  { label: "1.25",           value: "1.25" },
  { label: "1.5 — Normal",   value: "1.5" },
  { label: "1.6 — Relaxed",  value: "1.6" },
  { label: "1.75",           value: "1.75" },
  { label: "2.0 — Double",   value: "2" },
];

const SPECIAL_CHARS = [
  "\u00A9","\u00AE","\u2122","\u00B0","\u00B1","\u00D7","\u00F7","\u2260","\u2264","\u2265","\u2248","\u221E",
  "\u2190","\u2192","\u2191","\u2193","\u2194","\u21D2","\u21D0","\u21D4",
  "\u2022","\u2013","\u2014","\u2026","\u00AB","\u00BB","\u2018","\u2019","\u201C","\u201D",
  "\u03B1","\u03B2","\u03B3","\u03B4","\u03C0","\u03C3","\u03A9","\u03BC","\u03BB","\u2211","\u220F","\u221A",
  "\u20AC","\u00A3","\u00A5","\u00A2","$","\u00BF","\u00A1","\u00A7","\u00B6","\u2020","\u2021",
];

/* ─── Popover shells ─────────────────────────────────────────────────────── */
const ColorPopover = ({ anchorRect, swatches, onPick, onClose, showRemove, removeLabel }) => {
  const ref = useFixedPopover(true, onClose);
  if (!anchorRect) return null;
  return (
    <div
      className="color-popover"
      ref={ref}
      style={{ position: "fixed", top: anchorRect.bottom + 6, left: anchorRect.left, zIndex: 9999 }}
    >
      <div className="color-popover-grid">
        {swatches.map((s) => (
          <button
            key={s.label}
            type="button"
            className="color-swatch"
            style={{ background: s.value || "transparent" }}
            title={s.label}
            onClick={() => { onPick(s.value); onClose(); }}
          >
            {!s.value && <i className="fa-solid fa-slash"></i>}
          </button>
        ))}
      </div>
      {showRemove && (
        <button type="button" className="color-popover-remove" onClick={() => { onPick(null); onClose(); }}>
          {removeLabel}
        </button>
      )}
    </div>
  );
};

const TablePopover = ({ anchorRect, editor, onClose }) => {
  const ref = useFixedPopover(true, onClose);
  if (!anchorRect) return null;
  return (
    <div
      className="table-popover"
      ref={ref}
      style={{ position: "fixed", top: anchorRect.bottom + 6, left: anchorRect.left, zIndex: 9999 }}
    >
      <button type="button" onClick={() => { editor.chain().focus().addColumnBefore().run(); onClose(); }}><i className="fa-solid fa-table-columns"></i> Add column before</button>
      <button type="button" onClick={() => { editor.chain().focus().addColumnAfter().run(); onClose(); }}><i className="fa-solid fa-table-columns"></i> Add column after</button>
      <button type="button" onClick={() => { editor.chain().focus().addRowBefore().run(); onClose(); }}><i className="fa-solid fa-table-list"></i> Add row before</button>
      <button type="button" onClick={() => { editor.chain().focus().addRowAfter().run(); onClose(); }}><i className="fa-solid fa-table-list"></i> Add row after</button>
      <button type="button" onClick={() => { editor.chain().focus().toggleHeaderRow().run(); onClose(); }}><i className="fa-solid fa-heading"></i> Toggle header row</button>
      <button type="button" onClick={() => { editor.chain().focus().mergeCells().run(); onClose(); }}><i className="fa-solid fa-compress"></i> Merge cells</button>
      <button type="button" onClick={() => { editor.chain().focus().splitCell().run(); onClose(); }}><i className="fa-solid fa-expand"></i> Split cell</button>
      <button type="button" onClick={() => { editor.chain().focus().deleteColumn().run(); onClose(); }}><i className="fa-solid fa-delete-left"></i> Delete column</button>
      <button type="button" onClick={() => { editor.chain().focus().deleteRow().run(); onClose(); }}><i className="fa-solid fa-delete-left"></i> Delete row</button>
      <button type="button" className="danger" onClick={() => { editor.chain().focus().deleteTable().run(); onClose(); }}><i className="fa-regular fa-trash-can"></i> Delete table</button>
    </div>
  );
};

const ImagePopover = ({ anchorRect, editor, onClose }) => {
  const ref = useFixedPopover(true, onClose);
  
  const isImageActive = editor.isActive("image");
  const activeAttrs = isImageActive ? editor.getAttributes("image") : {};

  const [url, setUrl] = useState(activeAttrs.src || "");
  const [alt, setAlt] = useState(activeAttrs.alt || "");
  const [width, setWidth] = useState(activeAttrs.width || "100%");

  const handleInsert = (e) => {
    e.preventDefault();
    if (url) {
      editor.chain().focus().setImage({ src: url, alt, width }).run();
    }
    onClose();
  };

  if (!anchorRect) return null;

  return (
    <div
      className="image-popover"
      ref={ref}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 6,
        left: Math.min(anchorRect.left, window.innerWidth - 300),
        zIndex: 9999,
        width: 280,
      }}
    >
      <form onSubmit={handleInsert} className="image-popover-form">
        <div className="image-popover-header">
          {isImageActive ? "Edit Image" : "Insert Image"}
        </div>
        <div className="image-popover-field">
          <label style={{ display: "block", marginBottom: "0.25rem" }}>Image URL</label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="image-popover-field">
          <label style={{ display: "block", marginBottom: "0.25rem" }}>Alt Text (Description)</label>
          <input
            type="text"
            placeholder="A beautiful image"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>
        <div className="image-popover-field">
          <label style={{ display: "block", marginBottom: "0.25rem" }}>Image Width</label>
          <div className="image-width-selector" style={{ display: "flex", gap: "0.3rem" }}>
            {["25%", "50%", "75%", "100%"].map((w) => (
              <button
                key={w}
                type="button"
                className={`width-btn${width === w ? " active" : ""}`}
                style={{
                  flex: 1,
                  padding: "0.35rem 0.2rem",
                  fontSize: "0.74rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  background: width === w ? "var(--accent-teal)" : "var(--bg-input)",
                  color: width === w ? "#ffffff" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "background 0.15s, color 0.15s"
                }}
                onClick={() => setWidth(w)}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="image-popover-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-insert" disabled={!url}>
            {isImageActive ? "Update" : "Insert"}
          </button>
        </div>
      </form>
    </div>
  );
};


const DropdownPopover = ({ anchorRect, items, onPick, onClose, activeValue, width = 180 }) => {
  const ref = useFixedPopover(true, onClose);
  if (!anchorRect) return null;
  return (
    <div
      className="table-popover"
      ref={ref}
      style={{ position: "fixed", top: anchorRect.bottom + 6, left: anchorRect.left, zIndex: 9999, width }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={activeValue === item.value ? "active-item" : ""}
          style={item.value ? { fontFamily: item.value } : {}}
          onClick={() => { onPick(item.value); onClose(); }}
        >
          {item.label}
          {activeValue === item.value && <i className="fa-solid fa-check" style={{ marginLeft: "auto" }}></i>}
        </button>
      ))}
    </div>
  );
};

const SpecialCharsPopover = ({ anchorRect, onInsert, onClose }) => {
  const ref = useFixedPopover(true, onClose);
  if (!anchorRect) return null;
  return (
    <div
      className="special-chars-popover"
      ref={ref}
      style={{ position: "fixed", top: anchorRect.bottom + 6, left: anchorRect.left, zIndex: 9999 }}
    >
      <div className="special-chars-grid">
        {SPECIAL_CHARS.map((ch) => (
          <button
            key={ch}
            type="button"
            className="special-char-btn"
            title={ch}
            onClick={() => { onInsert(ch); onClose(); }}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─── Find & Replace Panel ───────────────────────────────────────────────── */
const FindReplacePanel = ({ editor, onClose }) => {
  const [find, setFind]       = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [count, setCount]     = useState(null);

  // Simple find: highlight all occurrences in editor content text
  const findAll = useCallback(() => {
    if (!find) { setCount(null); return; }
    const text = editor.getText();
    const flags = matchCase ? "g" : "gi";
    const matches = [...text.matchAll(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags))];
    setCount(matches.length);
  }, [find, matchCase, editor]);

  const replaceAll = () => {
    if (!find) return;
    const { doc, tr } = editor.state;
    const flags = matchCase ? "g" : "gi";
    let changed = 0;
    const newTr = editor.state.tr;

    doc.descendants((node, pos) => {
      if (!node.isText) return;
      const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      let m;
      const text = node.text;
      let offset = 0;
      const newText = text.replace(regex, (match) => { changed++; return replace; });
      if (newText !== text) {
        newTr.replaceWith(pos, pos + node.nodeSize, editor.schema.text(newText, node.marks));
      }
    });

    if (changed > 0) {
      editor.view.dispatch(newTr);
      setCount(0);
    }
  };

  return (
    <div className="find-replace-panel">
      <div className="find-replace-header">
        <span>Find & Replace</span>
        <button type="button" onClick={onClose} className="find-replace-close">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div className="find-replace-row">
        <input
          className="find-replace-input"
          placeholder="Find..."
          value={find}
          onChange={(e) => { setFind(e.target.value); setCount(null); }}
          onKeyDown={(e) => e.key === "Enter" && findAll()}
        />
        <button type="button" className="editor-toolbar-btn" onClick={findAll} title="Find">
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      </div>
      <div className="find-replace-row">
        <input
          className="find-replace-input"
          placeholder="Replace with..."
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && replaceAll()}
        />
        <button type="button" className="editor-toolbar-btn" onClick={replaceAll} title="Replace all">
          <i className="fa-solid fa-arrows-rotate"></i>
        </button>
      </div>
      <div className="find-replace-footer">
        <label className="find-replace-check">
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
          Match case
        </label>
        {count !== null && (
          <span className="find-replace-count">{count} match{count === 1 ? "" : "es"}</span>
        )}
      </div>
    </div>
  );
};

/* ─── Main Toolbar ───────────────────────────────────────────────────────── */
const EditorToolbar = ({ editor }) => {
  const [openPopover, setOpenPopover] = useState(null);
  const [anchorRect, setAnchorRect]   = useState(null);
  const [showFindReplace, setShowFindReplace] = useState(false);

  const colorBtnRef     = useRef(null);
  const highlightBtnRef = useRef(null);
  const tableBtnRef     = useRef(null);
  const fontSizeBtnRef  = useRef(null);
  const fontFamilyBtnRef = useRef(null);
  const lineHeightBtnRef = useRef(null);
  const textCaseBtnRef  = useRef(null);
  const specialCharBtnRef = useRef(null);
  const imageBtnRef     = useRef(null);

  if (!editor) return null;

  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    editor.on("transaction", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  const openWith = (name, ref) => {
    if (openPopover === name) { setOpenPopover(null); setAnchorRect(null); return; }
    setOpenPopover(name);
    setAnchorRect(ref?.current?.getBoundingClientRect() ?? null);
  };
  const close = () => { setOpenPopover(null); setAnchorRect(null); };

  const activeColor    = editor.getAttributes("textStyle").color;
  let activeFontSize = editor.getAttributes("textStyle").fontSize;
  let activeFontFamily = editor.getAttributes("textStyle").fontFamily;

  if (editor.state?.selection) {
    const { from } = editor.state.selection;
    const marks = editor.state.doc.resolve(from).marks();
    const textStyleMark = marks.find((m) => m.type.name === "textStyle");
    if (textStyleMark) {
      if (!activeFontSize) activeFontSize = textStyleMark.attrs.fontSize;
      if (!activeFontFamily) activeFontFamily = textStyleMark.attrs.fontFamily;
    }
  }
  const isHighlighted  = editor.isActive("highlight");

  const insertDate = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    editor.chain().focus().insertContent(formatted).run();
  };

  return (
    <>
      <div className="editor-toolbar">

        {/* ── Heading / paragraph style ── */}
        <select
          className="toolbar-select"
          title="Text style"
          value={
            editor.isActive("heading", { level: 1 }) ? "h1" :
            editor.isActive("heading", { level: 2 }) ? "h2" :
            editor.isActive("heading", { level: 3 }) ? "h3" :
            editor.isActive("blockquote")             ? "quote" : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
            else if (v === "quote") editor.chain().focus().toggleBlockquote().run();
            else editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Quote</option>
        </select>

        {/* ── Font family ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={fontFamilyBtnRef}
            type="button"
            className={`editor-toolbar-btn toolbar-select-btn${openPopover === "fontFamily" ? " active" : ""}`}
            title="Font family"
            onClick={() => openWith("fontFamily", fontFamilyBtnRef)}
          >
            <i className="fa-solid fa-font"></i>
            <i className="fa-solid fa-caret-down" style={{ fontSize: "0.6rem", marginLeft: 2 }}></i>
          </button>
          {openPopover === "fontFamily" && (
            <DropdownPopover
              anchorRect={anchorRect}
              items={FONT_FAMILIES}
              activeValue={activeFontFamily || null}
              onPick={(v) => {
                if (v) editor.chain().focus().setFontFamily(v).run();
                else editor.chain().focus().unsetFontFamily().run();
              }}
              onClose={close}
              width={200}
            />
          )}
        </div>

        {/* ── Font size ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={fontSizeBtnRef}
            type="button"
            className={`editor-toolbar-btn toolbar-select-btn${openPopover === "fontSize" ? " active" : ""}`}
            title="Font size"
            onClick={() => openWith("fontSize", fontSizeBtnRef)}
            style={{ minWidth: 48 }}
          >
            <span style={{ fontSize: "0.78rem" }}>{activeFontSize || "Size"}</span>
            <i className="fa-solid fa-caret-down" style={{ fontSize: "0.6rem", marginLeft: 2 }}></i>
          </button>
          {openPopover === "fontSize" && (
            <DropdownPopover
              anchorRect={anchorRect}
              items={FONT_SIZES.map((s) => ({ label: s, value: s }))}
              activeValue={activeFontSize || null}
              onPick={(v) => {
                if (v) editor.chain().focus().setFontSize(v).run();
                else editor.chain().focus().unsetFontSize().run();
              }}
              onClose={close}
              width={120}
            />
          )}
        </div>

        <Divider />

        {/* ── Core marks ── */}
        <Btn icon="fa-solid fa-bold"          label="Bold"          active={editor.isActive("bold")}          onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn icon="fa-solid fa-italic"        label="Italic"        active={editor.isActive("italic")}        onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn icon="fa-solid fa-underline"     label="Underline"     active={editor.isActive("underline")}     onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <Btn icon="fa-solid fa-strikethrough" label="Strikethrough" active={editor.isActive("strike")}        onClick={() => editor.chain().focus().toggleStrike().run()} />
        <Btn icon="fa-solid fa-code"          label="Inline code"   active={editor.isActive("code")}          onClick={() => editor.chain().focus().toggleCode().run()} />
        <Btn icon="fa-solid fa-subscript"     label="Subscript"     active={editor.isActive("subscript")}     onClick={() => editor.chain().focus().toggleSubscript().run()} />
        <Btn icon="fa-solid fa-superscript"   label="Superscript"   active={editor.isActive("superscript")}   onClick={() => editor.chain().focus().toggleSuperscript().run()} />

        <Divider />

        {/* ── Text color ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={colorBtnRef}
            type="button"
            className={`editor-toolbar-btn${!!activeColor || openPopover === "color" ? " active" : ""}`}
            title="Text color"
            onClick={() => openWith("color", colorBtnRef)}
          >
            <i className="fa-solid fa-font"></i>
          </button>
          {activeColor && <span className="toolbar-color-indicator" style={{ background: activeColor }} />}
          {openPopover === "color" && (
            <ColorPopover
              anchorRect={anchorRect}
              swatches={TEXT_COLORS}
              showRemove
              removeLabel="Default color"
              onPick={(v) => { if (v) editor.chain().focus().setColor(v).run(); else editor.chain().focus().unsetColor().run(); }}
              onClose={close}
            />
          )}
        </div>

        {/* ── Highlight ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={highlightBtnRef}
            type="button"
            className={`editor-toolbar-btn${isHighlighted || openPopover === "highlight" ? " active" : ""}`}
            title="Highlight"
            onClick={() => openWith("highlight", highlightBtnRef)}
          >
            <i className="fa-solid fa-highlighter"></i>
          </button>
          {openPopover === "highlight" && (
            <ColorPopover
              anchorRect={anchorRect}
              swatches={HIGHLIGHT_COLORS}
              showRemove
              removeLabel="Remove highlight"
              onPick={(v) => { if (v) editor.chain().focus().toggleHighlight({ color: v }).run(); else editor.chain().focus().unsetHighlight().run(); }}
              onClose={close}
            />
          )}
        </div>

        <Divider />

        {/* ── Alignment ── */}
        <Btn icon="fa-solid fa-align-left"    label="Align left"    active={editor.isActive({ textAlign: "left" })}    onClick={() => editor.chain().focus().setTextAlign("left").run()} />
        <Btn icon="fa-solid fa-align-center"  label="Align center"  active={editor.isActive({ textAlign: "center" })}  onClick={() => editor.chain().focus().setTextAlign("center").run()} />
        <Btn icon="fa-solid fa-align-right"   label="Align right"   active={editor.isActive({ textAlign: "right" })}   onClick={() => editor.chain().focus().setTextAlign("right").run()} />
        <Btn icon="fa-solid fa-align-justify" label="Justify"       active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} />

        {/* ── Line height ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={lineHeightBtnRef}
            type="button"
            className={`editor-toolbar-btn${openPopover === "lineHeight" ? " active" : ""}`}
            title="Line height"
            onClick={() => openWith("lineHeight", lineHeightBtnRef)}
          >
            <i className="fa-solid fa-text-height"></i>
          </button>
          {openPopover === "lineHeight" && (
            <DropdownPopover
              anchorRect={anchorRect}
              items={LINE_HEIGHTS}
              onPick={(v) => { if (v) editor.chain().focus().setLineHeight(v).run(); else editor.chain().focus().unsetLineHeight().run(); }}
              onClose={close}
              width={180}
            />
          )}
        </div>

        <Divider />

        {/* ── Lists ── */}
        <Btn icon="fa-solid fa-list-ul"    label="Bullet list"    active={editor.isActive("bulletList")}    onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn icon="fa-solid fa-list-ol"    label="Numbered list"  active={editor.isActive("orderedList")}   onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Btn icon="fa-solid fa-list-check" label="Checklist"      active={editor.isActive("taskList")}      onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <Btn icon="fa-solid fa-indent"     label="Indent"                                                   onClick={() => editor.chain().focus().sinkListItem("listItem").run()} />
        <Btn icon="fa-solid fa-outdent"    label="Outdent"                                                  onClick={() => editor.chain().focus().liftListItem("listItem").run()} />

        <Divider />

        {/* ── Blocks ── */}
        <Btn icon="fa-solid fa-file-code"  label="Code block"  active={editor.isActive("codeBlock")}  onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Btn icon="fa-solid fa-link"       label="Link"        active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href;
            const url  = window.prompt("URL", prev || "https://");
            if (url === null) return;
            if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        />
        <Btn icon="fa-solid fa-minus"      label="Divider"     onClick={() => editor.chain().focus().setHorizontalRule().run()} />

        {/* ── Table ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={tableBtnRef}
            type="button"
            className={`editor-toolbar-btn${editor.isActive("table") || openPopover === "table" ? " active" : ""}`}
            title="Table"
            onClick={() => editor.isActive("table") ? openWith("table", tableBtnRef) : editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <i className="fa-solid fa-table"></i>
          </button>
          {openPopover === "table" && editor.isActive("table") && (
            <TablePopover anchorRect={anchorRect} editor={editor} onClose={close} />
          )}
        </div>

        {/* ── Image ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={imageBtnRef}
            type="button"
            className={`editor-toolbar-btn${openPopover === "image" ? " active" : ""}`}
            title="Insert image by URL"
            onClick={() => openWith("image", imageBtnRef)}
          >
            <i className="fa-regular fa-image"></i>
          </button>
          {openPopover === "image" && (
            <ImagePopover anchorRect={anchorRect} editor={editor} onClose={close} />
          )}
        </div>

        <Divider />

        {/* ── Text case ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={textCaseBtnRef}
            type="button"
            className={`editor-toolbar-btn${openPopover === "textCase" ? " active" : ""}`}
            title="Text case"
            onClick={() => openWith("textCase", textCaseBtnRef)}
          >
            <i className="fa-solid fa-text-width"></i>
          </button>
          {openPopover === "textCase" && (
            <DropdownPopover
              anchorRect={anchorRect}
              items={[
                { label: "UPPERCASE", value: "upper" },
                { label: "lowercase", value: "lower" },
                { label: "Title Case", value: "title" },
              ]}
              onPick={(v) => {
                if (v === "upper") editor.chain().focus().setUpperCase().run();
                else if (v === "lower") editor.chain().focus().setLowerCase().run();
                else editor.chain().focus().setTitleCase().run();
              }}
              onClose={close}
              width={150}
            />
          )}
        </div>

        {/* ── Special characters ── */}
        <div className="toolbar-popover-anchor">
          <button
            ref={specialCharBtnRef}
            type="button"
            className={`editor-toolbar-btn${openPopover === "specialChars" ? " active" : ""}`}
            title="Special characters"
            onClick={() => openWith("specialChars", specialCharBtnRef)}
          >
            <span style={{ fontWeight: "bold", fontSize: "0.85rem", fontFamily: "sans-serif" }}>Ω</span>
          </button>
          {openPopover === "specialChars" && (
            <SpecialCharsPopover
              anchorRect={anchorRect}
              onInsert={(ch) => editor.chain().focus().insertContent(ch).run()}
              onClose={close}
            />
          )}
        </div>

        {/* ── Insert date ── */}
        <Btn icon="fa-regular fa-calendar" label="Insert date/time" onClick={insertDate} />

        {/* ── Clear formatting ── */}
        <Btn icon="fa-solid fa-text-slash" label="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        />

        <Divider />

        {/* ── Find & replace ── */}
        <Btn
          icon="fa-solid fa-magnifying-glass"
          label="Find & Replace"
          active={showFindReplace}
          onClick={() => setShowFindReplace((v) => !v)}
        />

        <Divider />

        {/* ── Undo / redo ── */}
        <Btn icon="fa-solid fa-rotate-left"  label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
        <Btn icon="fa-solid fa-rotate-right" label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />

      </div>

      {/* ── Find & Replace panel (below toolbar, above editor content) ── */}
      {showFindReplace && (
        <FindReplacePanel editor={editor} onClose={() => setShowFindReplace(false)} />
      )}
    </>
  );
};

export default EditorToolbar;