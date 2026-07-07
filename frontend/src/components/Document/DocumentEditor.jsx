import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import ImageResize from "tiptap-extension-resize-image";
import { FontSize, LineHeight, TextCase } from "./editorExtensions";
import EditorToolbar from "./EditorToolbar";

const SLASH_COMMANDS = [
  {
    key: "h1",
    label: "Heading 1",
    desc: "Big section heading",
    icon: "fa-solid fa-heading",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    searchTerms: ["h1", "heading", "title", "large"]
  },
  {
    key: "h2",
    label: "Heading 2",
    desc: "Medium section heading",
    icon: "fa-solid fa-heading",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    searchTerms: ["h2", "heading", "subtitle", "medium"]
  },
  {
    key: "h3",
    label: "Heading 3",
    desc: "Small section heading",
    icon: "fa-solid fa-heading",
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    searchTerms: ["h3", "heading", "small"]
  },
  {
    key: "bullet",
    label: "Bullet List",
    desc: "Create a simple bulleted list",
    icon: "fa-solid fa-list-ul",
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
    searchTerms: ["bullet", "list", "ul", "unordered"]
  },
  {
    key: "numbered",
    label: "Numbered List",
    desc: "Create a list with numbering",
    icon: "fa-solid fa-list-ol",
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    searchTerms: ["numbered", "list", "ol", "ordered"]
  },
  {
    key: "todo",
    label: "To-do List",
    desc: "Track tasks with checkboxes",
    icon: "fa-solid fa-square-check",
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
    searchTerms: ["todo", "task", "checkbox", "checklist"]
  },
  {
    key: "code",
    label: "Code Block",
    desc: "Insert code block",
    icon: "fa-solid fa-code",
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    searchTerms: ["code", "pre", "monospace", "block"]
  },
  {
    key: "quote",
    label: "Blockquote",
    desc: "Insert blockquote styling",
    icon: "fa-solid fa-quote-left",
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    searchTerms: ["quote", "blockquote", "bq", "citation"]
  },
  {
    key: "divider",
    label: "Divider",
    desc: "Insert horizontal divider",
    icon: "fa-solid fa-minus",
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    searchTerms: ["divider", "hr", "line", "rule"]
  },
  {
    key: "table",
    label: "Table",
    desc: "Insert simple grid table",
    icon: "fa-solid fa-table",
    action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    searchTerms: ["table", "grid", "spreadsheet"]
  },
  {
    key: "image",
    label: "Image",
    desc: "Insert image by URL",
    icon: "fa-regular fa-image",
    action: (editor) => {
      const url = window.prompt("Enter image URL:");
      if (url) {
        const alt = window.prompt("Enter image description (optional):") || "";
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
    },
    searchTerms: ["image", "picture", "photo", "img"]
  }
];

const DocumentEditor = ({ value, onChange, editable = true, outputType = "json" }) => {
  const [slashMenu, setSlashMenu] = useState({
    active: false,
    query: "",
    x: 0,
    y: 0,
    selectedIndex: 0,
  });

  // Keep refs to avoid stale closures in tiptap event handlers
  const slashMenuRef = useRef(slashMenu);
  const menuContainerRef = useRef(null);
  const lastInteractionRef = useRef("keyboard"); // "keyboard" | "mouse"

  useEffect(() => {
    slashMenuRef.current = slashMenu;
  }, [slashMenu]);

  // Scroll active item into view during arrow-key navigation
  useEffect(() => {
    if (
      slashMenu.active &&
      lastInteractionRef.current === "keyboard" &&
      menuContainerRef.current
    ) {
      const activeEl = menuContainerRef.current.querySelector(
        ".slash-command-item.active"
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      }
    }
  }, [slashMenu.selectedIndex, slashMenu.active]);

  // Close the menu if any parent element is scrolled (standard editor behavior)
  useEffect(() => {
    const handleScroll = (event) => {
      if (
        menuContainerRef.current &&
        menuContainerRef.current.contains(event.target)
      ) {
        return; // Allow scrolling inside the slash menu itself
      }
      setSlashMenu((prev) => (prev.active ? { ...prev, active: false } : prev));
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Handle wheel scrolling inside the slash menu to prevent background scrolling
  useEffect(() => {
    const menuEl = menuContainerRef.current;
    if (!menuEl || !slashMenu.active) return;

    const handleWheel = (e) => {
      // Prevent default page scroll chaining
      e.preventDefault();
      e.stopPropagation();
      // Scroll the menu container manually
      menuEl.scrollTop += e.deltaY;
    };

    menuEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      menuEl.removeEventListener("wheel", handleWheel);
    };
  }, [slashMenu.active]);

  // Compute filtered commands based on active query
  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    const q = slashMenu.query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.searchTerms.some((term) => term.toLowerCase().includes(q))
    );
  });

  const filteredRef = useRef(filteredCommands);
  useEffect(() => {
    filteredRef.current = filteredCommands;
  }, [filteredCommands]);

  const executeCommand = (command) => {
    if (!editor) return;
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    const slashIndex = textBefore.lastIndexOf("/");

    if (slashIndex !== -1) {
      const from = $from.pos - (textBefore.length - slashIndex);
      const to = $from.pos;
      editor.chain().focus().deleteRange({ from, to }).run();
    }

    command.action(editor);
    setSlashMenu((prev) => ({ ...prev, active: false }));
  };

  const executeCommandRef = useRef(executeCommand);
  useEffect(() => {
    executeCommandRef.current = executeCommand;
  });

  const checkSlashCommand = (editorInstance) => {
    const { state } = editorInstance;
    const { selection } = state;
    const { $from, empty } = selection;

    if (!empty) {
      setSlashMenu((prev) => (prev.active ? { ...prev, active: false } : prev));
      return;
    }

    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    const slashIndex = textBefore.lastIndexOf("/");

    if (slashIndex !== -1) {
      const isTrigger = slashIndex === 0 || textBefore.charAt(slashIndex - 1) === " ";
      if (isTrigger) {
        const query = textBefore.substring(slashIndex + 1);
        if (!query.includes(" ")) {
          const coords = editorInstance.view.coordsAtPos($from.pos);
          setSlashMenu((prev) => ({
            active: true,
            query,
            x: coords.left,
            y: coords.bottom,
            selectedIndex: prev.active && prev.query === query ? prev.selectedIndex : 0,
          }));
          return;
        }
      }
    }

    setSlashMenu((prev) => (prev.active ? { ...prev, active: false } : prev));
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      TextCase,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: "Write something brilliant (Type / for formatting commands)...",
      }),
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ImageResize.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
    ],
    content: value || "",
    editable,
    onUpdate: ({ editor }) => {
      if (outputType === "html") {
        onChange?.(editor.getHTML());
      } else {
        onChange?.(editor.getJSON());
      }
      checkSlashCommand(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      checkSlashCommand(editor);
    },
    editorProps: {
      attributes: {
        class: "document-editor-content scroll-thin",
      },
      handleKeyDown: (view, event) => {
        const menuState = slashMenuRef.current;
        const commands = filteredRef.current;
        if (!menuState.active || commands.length === 0) return false;

        if (event.key === "ArrowDown") {
          lastInteractionRef.current = "keyboard";
          setSlashMenu((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % commands.length,
          }));
          return true;
        }

        if (event.key === "ArrowUp") {
          lastInteractionRef.current = "keyboard";
          setSlashMenu((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex - 1 + commands.length) % commands.length,
          }));
          return true;
        }

        if (event.key === "Enter") {
          const selected = commands[menuState.selectedIndex];
          if (selected) {
            executeCommandRef.current(selected);
            return true;
          }
        }

        if (event.key === "Escape") {
          setSlashMenu((prev) => ({ ...prev, active: false }));
          return true;
        }

        return false;
      },
    },
  });

  // Handle content rehydration on active note/page switches
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = outputType === "html" ? editor.getHTML() : editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(value)) {
        editor.commands.setContent(value || "", false);
      }
    }
  }, [value, editor, outputType]);

  // Handle editable state updates dynamically
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  // Handle positioning safety margins
  const leftPos = Math.min(slashMenu.x, window.innerWidth - 280);
  const topPos = slashMenu.y + 250 > window.innerHeight ? slashMenu.y - 270 : slashMenu.y + 8;

  return (
    <div className="document-editor" style={{ position: "relative" }}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      
      {slashMenu.active && filteredCommands.length > 0 && (
        <div
          ref={menuContainerRef}
          className="slash-command-menu"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            left: `${leftPos}px`,
            top: `${topPos}px`,
            zIndex: 2000,
          }}
        >
          {filteredCommands.map((cmd, idx) => (
            <div
              key={cmd.key}
              className={`slash-command-item${idx === slashMenu.selectedIndex ? " active" : ""}`}
              onClick={() => executeCommand(cmd)}
            >
              <span className="slash-cmd-icon">
                <i className={cmd.icon}></i>
              </span>
              <div className="slash-cmd-info">
                <div className="slash-cmd-label">{cmd.label}</div>
                <div className="slash-cmd-desc">{cmd.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;