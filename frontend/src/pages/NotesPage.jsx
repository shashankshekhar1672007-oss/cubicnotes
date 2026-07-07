import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import { parseMarkdown } from "../utils/parseMarkdown";
import { parseMarkdown as parseMarkdownFile } from "../utils/markdownConverter";
import Modal from "../components/UI/Modal";
import TemplateSelectorModal from "../components/UI/TemplateSelectorModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import NoteHeader from "../components/Editor/NoteHeader";
import RichTextEditor from "../components/Editor/RichTextEditor";
import NoteGrid from "../components/Notes/NoteGrid";
import Button from "../components/UI/Button";
import FloatingAIIcon from "../components/UI/FloatingAIIcon";
import { useDebounce } from "../hooks/useDebounce";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_NOTES } from "../data/ghostDemoData";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import "../assets/styles/pages/notes.css";
import "../assets/styles/components/editor-overrides.css";

const ACCENTS = [
  "var(--accent-teal)", "var(--accent-purple)", "var(--accent-amber)",
  "var(--accent-coral)", "var(--accent-blue)", "var(--accent-pink)",
  "var(--accent-lime)", "var(--accent-yellow)", "var(--accent-cyan)",
  "var(--accent-peach)",
];

const fetchNotesList = async ({ queryKey }) => {
  const [_, search] = queryKey;
  const { data } = await api.get("/notes", { params: search ? { search } : {} });
  return data;
};

const NotesPage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { guardAction, isGhost } = useGhostGuard();

  const [view, setView] = useState("grid");
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [subheading, setSubheading] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState("edit");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [selectedTag, setSelectedTag] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all | pinned | tag
  const [accent, setAccent] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [customColors, setCustomColors] = useState(() => {
    try {
      const raw = localStorage.getItem("cael_notes_custom_colors");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed.slice(0, 10);
    } catch (e) {}
    return Array(10).fill(null);
  });
  const skipAccentSave = useRef(false);

  // Custom Feature References & States
  const fileInputRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);

  const touchTimerRef = useRef(null);
  const touchActiveIdRef = useRef(null);
  const isLongPressRef = useRef(false);
  const ignoreNextClickRef = useRef(null);

  const handleTouchStart = (id) => {
    isLongPressRef.current = false;
    touchActiveIdRef.current = id;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      ignoreNextClickRef.current = id;
      handleToggleSelect(id);
    }, 600);
  };

  const handleTouchEnd = (id, e) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      setTimeout(() => {
        ignoreNextClickRef.current = null;
      }, 300);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === allVisibleNotes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allVisibleNotes.map((n) => n._id));
    }
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  const resolveAccentValue = (acc) => {
    if (!acc) {
      try {
        return getComputedStyle(document.documentElement).getPropertyValue("--accent-teal") || "#0ea98a";
      } catch (e) {
        return "#0ea98a";
      }
    }
    try {
      const varMatch = acc.match(/var\((--[a-z0-9-]+)\)/i);
      if (varMatch) {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varMatch[1]);
        return val ? val.trim() : acc;
      }
    } catch (e) {
      // ignore
    }
    return acc;
  };

  const currentAccentColor = useMemo(() => (accent ? resolveAccentValue(accent) : null), [accent]);

  const containerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(220);
  const [cols, setCols] = useState(4);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    
    const calculateWidth = () => {
      if (!containerRef.current) return;
      const clientW = containerRef.current.clientWidth;
      if (!clientW) return;
      const style = window.getComputedStyle(containerRef.current);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const containerW = clientW - paddingLeft - paddingRight;
      const width = window.innerWidth;
      
      // Get base font size to resolve rem units accurately
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      
      if (width <= 480) {
        const gap = 0.75 * rootFontSize; // 0.75rem
        if (width <= 390) {
          setCols(1);
          setCardWidth(containerW);
        } else {
          setCols(2);
          setCardWidth((containerW - gap) / 2);
        }
      } else {
        const gap = 1.1 * rootFontSize; // 1.1rem
        const maxCols = width <= 900 ? 3 : 4;
        const minCardW = 160; // Enforced minimum width for card columns
        
        let calculatedCols = maxCols;
        while (calculatedCols > 1 && ((containerW - (calculatedCols - 1) * gap) / calculatedCols) < minCardW) {
          calculatedCols--;
        }
        
        setCols(calculatedCols);
        setCardWidth((containerW - (calculatedCols - 1) * gap) / calculatedCols);
      }
    };

    calculateWidth();

    const observer = new ResizeObserver(() => {
      calculateWidth();
    });
    observer.observe(containerRef.current);
    
    window.addEventListener("resize", calculateWidth);
    
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", calculateWidth);
    };
  }, []);

  const editorRef = useRef(null);
  const skipNextSave = useRef(true);
  const noteIdRef = useRef(null);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (view !== "editor") return;

    const handleClickOutside = (e) => {
      if (editorRef.current && !editorRef.current.contains(e.target)) {
        const isCard = e.target.closest(".note-card-grid") || e.target.closest(".note-card");
        const isNewNoteBtn = e.target.closest(".notes-add-circular-btn");
        const isDropdown = e.target.closest(".ncg-dropdown-menu");

        if (!isCard && !isNewNoteBtn && !isDropdown) {
          closeEditor();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [view]);

  const { data: serverNotes = [], isLoading: loading } = useQuery({
    queryKey: ["notes", debouncedSearch],
    queryFn: fetchNotesList,
    enabled: !isGhost,
  });

  const { data: allNotesForTags = [] } = useQuery({
    queryKey: ["notes", ""],
    queryFn: fetchNotesList,
    enabled: !isGhost,
  });

  const allUserTags = useMemo(() => {
    const list = isGhost ? GHOST_NOTES : allNotesForTags;
    const tagSet = new Set();
    list.forEach((note) => {
      note.tags?.forEach((tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          tagSet.add(cleanTag);
        }
      });
    });
    return Array.from(tagSet);
  }, [allNotesForTags, isGhost]);

  // Client-side search and tag filter for ghost mode, otherwise server notes
  const notes = useMemo(() => {
    if (isGhost) {
      if (!debouncedSearch.trim()) return GHOST_NOTES;
      const term = debouncedSearch.toLowerCase();
      return GHOST_NOTES.filter((n) =>
        n.title.toLowerCase().includes(term) ||
        n.content.toLowerCase().includes(term) ||
        (n.subheading && n.subheading.toLowerCase().includes(term)) ||
        n.tags?.some((t) => t.toLowerCase().includes(term))
      );
    }
    return serverNotes;
  }, [isGhost, serverNotes, debouncedSearch]);

  // Extract all tags dynamically from notes list
  const allTags = useMemo(() => {
    const counts = {};
    notes.forEach((note) => {
      note.tags?.forEach((tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          counts[cleanTag] = (counts[cleanTag] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [notes]);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    const term = tagSearch.toLowerCase();
    return allTags.filter(([tag]) => tag.includes(term));
  }, [allTags, tagSearch]);

  // Client-side instant filter by selected tag / filter type
  const filteredNotes = useMemo(() => {
    if (filterType === "pinned") {
      return notes.filter((n) => n.isPinned);
    }
    if (filterType === "unpinned") {
      return notes.filter((n) => !n.isPinned);
    }
    if (filterType === "tag" && selectedTag) {
      return notes.filter((n) => n.tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));
    }
    return notes; // "all"
  }, [notes, filterType, selectedTag]);

  const pinnedNotesForSection = useMemo(() => {
    return filteredNotes.filter((n) => n.isPinned);
  }, [filteredNotes]);

  // Ensure main notes list is sorted by created date (newest first)
  const sortedFilteredNotes = useMemo(() => {
    const copy = Array.isArray(filteredNotes) ? [...filteredNotes] : [];
    copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return copy;
  }, [filteredNotes]);

  const allVisibleNotes = useMemo(() => {
    const visible = [];
    if (filterType !== "pinned") {
      visible.push(...pinnedNotesForSection);
    }
    visible.push(...sortedFilteredNotes);
    return visible;
  }, [filterType, pinnedNotesForSection, sortedFilteredNotes]);

  /* Open note from navigation state (Dashboard link) or handle createNew from dashboard link */
  useEffect(() => {
    if (location.state?.createNew) {
      guardAction(openNew);
      window.history.replaceState({}, document.title);
      return;
    }
    const noteId = location.state?.noteId;
    if (noteId && notes.length) {
      const found = notes.find((n) => n._id === noteId);
      if (found) openNote(found, isGhost ? "preview" : (location.state?.mode || "preview"));
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, notes.length, isGhost]);

  /* ── Helpers ───────────────────────────────────── */
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const onDocClick = (e) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target) &&
        !e.target.closest('.note-color-button')
      ) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [colorPickerOpen]);

  useEffect(() => {
    if (!exportDropdownOpen) return;
    const onDocClick = (e) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target) &&
        !e.target.closest('.notes-editor-export')
      ) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportDropdownOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("cael_notes_custom_colors", JSON.stringify(customColors));
    } catch (e) {}
  }, [customColors]);

  const saveAccentChange = async (resolvedAccent) => {
    if (isGhost) return;

    const noteId = noteIdRef.current;
    setSaveState("saving");
    setSaving(true);

    try {
      if (noteId) {
        const { data } = await api.put(`/notes/${noteId}`, { accent: resolvedAccent });
        setActiveNote((cur) => (cur?._id === data._id ? data : cur));
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      } else if (title.trim() || content.trim()) {
        const accentToUse = resolvedAccent || ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
        const { data } = await api.post("/notes", { title: title || "Untitled Note", subheading, content, tags, accent: accentToUse });
        noteIdRef.current = data._id;
        setActiveNote(data);
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (err) {
      setSaveState("idle");
    } finally {
      setSaving(false);
    }
  };

  const handleAccentChange = (newAccent) => {
    if (editorMode === "preview") return;
    setAccent(newAccent);
  };

  const saveCustomColorSlot = (index) => {
    if (!currentAccentColor) return;
    setCustomColors((prev) => {
      const copy = [...prev];
      copy[index] = currentAccentColor;
      return copy;
    });
  };

  const clearCustomColorSlot = (index) => {
    setCustomColors((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  useEffect(() => {
    if (skipAccentSave.current) {
      skipAccentSave.current = false;
      return;
    }
    if (accent === null) return;
    const delayedSave = setTimeout(() => {
      saveAccentChange(accent);
    }, 420);
    return () => clearTimeout(delayedSave);
  }, [accent]);
  const openNote = (note, mode = "edit") => {
    skipNextSave.current = true;
    skipAccentSave.current = true;
    noteIdRef.current = note._id;
    setActiveNote(note);
    setTitle(note.title);
    setSubheading(note.subheading || "");
    setContent(note.content);
    setTags(note.tags || []);
    setEditorMode(mode);
    setView("editor");
    // set current accent from note (if present) or leave null
    setAccent(note.accent || null);
  };

  const openNew = () => {
    handleTemplateSelect({
      id: "blank",
      title: "",
      subheading: "",
      content: "",
      tags: []
    });
  };

  const handleTemplateSelect = (template) => {
    skipNextSave.current = true;
    skipAccentSave.current = true;
    noteIdRef.current = null;
    setActiveNote(null);
    setTitle(template.title);
    setSubheading(template.subheading);
    setContent(template.content);
    setTags(template.tags || []);
    setEditorMode("edit");
    setView("editor");

    if (template.id !== "blank" && template.color) {
      setAccent(template.color);
    } else {
      const randomAccent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
      setAccent(randomAccent);
    }
  };

  const closeEditor = () => {
    setView("grid");
    setActiveNote(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && view === "editor") {
        closeEditor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  /* ── Speech Recognition Dictation ── */
  useEffect(() => {
    if (isSpeechSupported) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        insertTextAtCursor(" " + transcript);
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error:", e);
        if (e.error === "no-speech" || e.error === "aborted") {
          return;
        }
        setIsRecording(false);
        if (e.error === "not-allowed") {
          toast.error("Microphone permission denied. Please enable mic access.");
        } else if (e.error === "audio-capture") {
          toast.error("Microphone not found. Please connect a microphone.");
        } else if (e.error === "network") {
          toast.error("Speech recognition network error. Please check your internet connection.");
        } else {
          toast.error(`Speech recognition: ${e.error || "encountered an error"}`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [isSpeechSupported]);

  const insertTextAtCursor = (text) => {
    const textarea = document.getElementById("note-body");
    if (!textarea) {
      setContent(prev => prev + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = textarea.value;
    
    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const toggleDictation = () => {
    if (!recognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
      toast.success("Listening... Speak into your mic.");
    }
  };



  /* ── Drag & Drop / Manual Markdown Import ── */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editorMode === "preview") return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (editorMode === "preview") return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".md")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          const parsed = parseMarkdownFile(text);
          setTitle(parsed.title || file.name.replace(/\.md$/i, ""));
          setSubheading(parsed.subheading || "");
          setTags(parsed.tags || []);
          setContent(parsed.contentMarkdown || "");
          toast.success(`Imported "${file.name}" successfully!`);
        };
        reader.readAsText(file);
      } else {
        toast.error("Please drop a valid Markdown (.md) file.");
      }
    }
  };

  const handleFileImport = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const parsed = parseMarkdownFile(text);
        
        skipNextSave.current = true;
        skipAccentSave.current = true;
        noteIdRef.current = null;
        setActiveNote(null);
        setTitle(parsed.title || file.name.replace(/\.md$/i, ""));
        setSubheading(parsed.subheading || "");
        setTags(parsed.tags || []);
        setContent(parsed.contentMarkdown || "");
        setEditorMode("edit");
        setView("editor");
        
        const randomAccent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
        setAccent(randomAccent);

        toast.success(`Imported "${file.name}"!`);
      };
      reader.readAsText(file);
    }
  };

  /* ── Version Revisions ── */
  const openRevisions = async () => {
    if (!activeNote) return;
    setRevisionsLoading(true);
    setShowRevisionsModal(true);
    try {
      const { data } = await api.get(`/notes/${activeNote._id}/revisions`);
      setRevisions(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load version history.");
    } finally {
      setRevisionsLoading(false);
    }
  };

  const handleRestoreRevision = async (revisionId) => {
    if (!activeNote) return;
    const loadingToast = toast.loading("Restoring note version...");
    try {
      const { data } = await api.post(`/notes/${activeNote._id}/revisions/${revisionId}/restore`);
      
      setTitle(data.note.title);
      setSubheading(data.note.subheading || "");
      setTags(data.note.tags || []);
      setContent(data.note.content || "");
      setAccent(data.note.accent || null);
      setActiveNote(data.note);

      queryClient.invalidateQueries({ queryKey: ["notes"] });
      
      toast.success("Note version restored!");
      setShowRevisionsModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore note version.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handlePreviewRevision = (rev) => {
    setPreviewRevision(rev);
  };

  const triggerDownload = (text, mimeType, extension) => {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "untitled";
    link.download = `${slug}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Note exported as ${extension.toUpperCase()}!`);
  };

  const handleExportMarkdown = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Nothing to export!");
      return;
    }
    const metadata = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nsubheading: "${(subheading || "").replace(/"/g, '\\"')}"\ntags: ${JSON.stringify(tags || [])}\ndate: "${new Date().toISOString()}"\n---\n\n`;
    const markdownText = metadata + content;
    triggerDownload(markdownText, "text/markdown", "md");
  };

  const handleExportHTML = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Nothing to export!");
      return;
    }
    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title || "Untitled Note"}</title>
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
      <h1 class="note-title">${title || "Untitled Note"}</h1>
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

  const handleExportTXT = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Nothing to export!");
      return;
    }
    const textContent = `Title: ${title || "Untitled"}\nSubheading: ${subheading || ""}\nTags: ${tags.join(", ") || ""}\nDate: ${new Date().toLocaleString()}\n\n========================================\n\n${content}`;
    triggerDownload(textContent, "text/plain", "txt");
  };

  const handleExportJSON = () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Nothing to export!");
      return;
    }
    const jsonObject = {
      title,
      subheading,
      content,
      tags,
      accent,
      exportedAt: new Date().toISOString()
    };
    triggerDownload(JSON.stringify(jsonObject, null, 2), "application/json", "json");
  };

  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").trim();
  };

  /* ── Autosave debounces & sync ── */
  const debouncedTitle = useDebounce(title, 800);
  const debouncedSubheading = useDebounce(subheading, 800);
  const debouncedContent = useDebounce(content, 1000);
  const debouncedTags = useDebounce(tags, 800);

  useEffect(() => {
    if (isGhost) return; // Autosave disabled in ghost mode
    if (view !== "editor") return;
    if (editorMode === "preview") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const noteIdToSave = noteIdRef.current;

    // Draft creation check
    if (!noteIdToSave && !debouncedTitle.trim() && !debouncedContent.trim()) {
      return;
    }

    const save = async () => {
      setSaveState("saving");
      setSaving(true);
      try {
        if (noteIdToSave) {
          const { data } = await api.put(`/notes/${noteIdToSave}`, {
            title: debouncedTitle || "Untitled Note",
            subheading: debouncedSubheading,
            content: debouncedContent,
            tags: debouncedTags,
            accent: accent || (activeNote && activeNote.accent) || ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
          });
          queryClient.setQueryData(["notes", debouncedSearch], (oldNotes) =>
            oldNotes ? oldNotes.map((n) => (n._id === data._id ? data : n)) : []
          );
          setActiveNote((current) => (current?._id === data._id ? data : current));
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          const accentToUse = accent || ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
          const { data } = await api.post("/notes", {
            title: debouncedTitle || "Untitled Note",
            subheading: debouncedSubheading,
            content: debouncedContent,
            tags: debouncedTags,
            accent: accentToUse,
          });
          noteIdRef.current = data._id;
          setActiveNote(data);
          queryClient.invalidateQueries({ queryKey: ["notes"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        }
      } catch (err) {
        setSaveState("idle");
      } finally {
        setSaving(false);
      }
    };

    save();
  }, [debouncedTitle, debouncedSubheading, debouncedContent, JSON.stringify(debouncedTags), isGhost]);

  /* ── Export Note to PDF ── */
  const handleExportPDF = () => {
    if (!title.trim() && !content.trim()) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlString = `
      <html>
        <head>
          <title>${title || "Note"}</title>
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
            <h1 class="note-title">${title || "Untitled"}</h1>
            ${subheading ? '<h2 class="note-subheading">' + subheading + '</h2>' : ""}
            ${tags.length ? '<div class="note-tags">' + tags.map(t => '<span class="tag">#' + t + '</span>').join("") + '</div>' : ""}
          </div>
          <div class="note-content">
            ${parseMarkdown(content)}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlString);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };



  /* ── Save / update ─────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editorMode === "preview") {
      guardAction(() => setEditorMode("edit"));
      return;
    }
    if (!title.trim() || !content.trim()) return;

    guardAction(async () => {
      setSaving(true);
      setSaveState("saving");

      try {
        const noteIdToSave = noteIdRef.current || activeNote?._id;
        if (noteIdToSave) {
          const { data } = await api.put(`/notes/${noteIdToSave}`, { title, subheading, content, tags, accent: accent || (activeNote && activeNote.accent) });
          setActiveNote(data);
          toast.success("Note saved successfully!");
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          const accentToUse = accent || ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
          const { data } = await api.post("/notes", { title, subheading, content, tags, accent: accentToUse });
          noteIdRef.current = data._id;
          setActiveNote(data);
          setTitle(data.title);
          setSubheading(data.subheading || "");
          setContent(data.content);
          setTags(data.tags || []);
          toast.success("Note created successfully!");
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        }
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to save note.");
        setSaveState("idle");
      } finally {
        setSaving(false);
      }
    });
  };

  const togglePin = async (note) => {
    guardAction(async () => {
      try {
        await api.put(`/notes/${note._id}`, { isPinned: !note.isPinned });
        toast.success(note.isPinned ? "Note unpinned" : "Note pinned!");
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      } catch (err) {
        toast.error("Failed to pin note.");
      }
    });
  };
  const deleteNote = (note) => {
    showConfirm({
      title: "Move Note to Trash?",
      message: `Are you sure you want to move the note "${note.title || "Untitled"}" to the trash?`,
      confirmLabel: "Move to Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        const isActive = activeNote?._id === note._id;
        if (isActive) {
          skipNextSave.current = true;
          skipAccentSave.current = true;
          noteIdRef.current = null;
          closeEditor();
        }
        guardAction(async () => {
          try {
            await api.delete(`/notes/${note._id}`);
            toast.success("Note moved to trash");
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.error("Failed to delete note.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleBatchPin = async () => {
    guardAction(async () => {
      try {
        await Promise.all(selectedIds.map(id => api.put(`/notes/${id}`, { isPinned: true })));
        toast.success("Notes pinned successfully!");
        setSelectedIds([]);
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      } catch (err) {
        toast.error("Failed to pin notes.");
      }
    });
  };

  const handleBatchUnpin = async () => {
    guardAction(async () => {
      try {
        await Promise.all(selectedIds.map(id => api.put(`/notes/${id}`, { isPinned: false })));
        toast.success("Notes unpinned successfully!");
        setSelectedIds([]);
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      } catch (err) {
        toast.error("Failed to unpin notes.");
      }
    });
  };

  const handleBatchDelete = () => {
    showConfirm({
      title: "Move Notes to Trash?",
      message: `Are you sure you want to move ${selectedIds.length} selected notes to the trash?`,
      confirmLabel: "Move to Trash",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        if (activeNote && selectedIds.includes(activeNote._id)) {
          skipNextSave.current = true;
          skipAccentSave.current = true;
          noteIdRef.current = null;
          closeEditor();
        }
        guardAction(async () => {
          try {
            await Promise.all(selectedIds.map(id => api.delete(`/notes/${id}`)));
            toast.success("Notes moved to trash");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["trashedNotes"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          } catch (err) {
            toast.error("Failed to delete notes.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  return (
    <div className={`notes-page${view === "editor" ? " editor-open" : ""}${selectedIds.length > 0 ? " selection-active" : ""}`}>

      {/* ── Grid view ──────────────────────────────── */}
      <div className="notes-grid-view">
        <div className="notes-grid-content">
          {/* Dynamic Tags Sidebar */}
          <aside className="notes-tag-sidebar">
            <div className="notes-sidebar-header-section">
              <div>
                <h1 className="page-heading" style={{ marginBottom: 0 }}>Notes</h1>
                <p className="page-subheading">Jot ideas.</p>
              </div>
              <div className="notes-sidebar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="notes-import-btn"
                  title="Import Markdown (.md) File"
                >
                  <i className="fa-solid fa-file-import"></i>
                </button>
                <button onClick={() => guardAction(openNew)} className="notes-add-circular-btn" title="Create New Note">
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept=".md" 
              onChange={handleFileImport} 
            />
            <div className="notes-desktop-import-btn-container">
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Import Markdown (.md) File"
                style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontSize: '0.82rem', padding: '0.45rem' }}
              >
                <i className="fa-solid fa-file-import"></i>
                Import Markdown
              </Button>
            </div>
            <div className="notes-tag-list-scroll">
              <div className="notes-tag-search-container">
                <i className="fa-solid fa-magnifying-glass notes-tag-search-icon"></i>
                <input
                  type="text"
                  className="notes-tag-search-input"
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
                {tagSearch && (
                  <button
                    type="button"
                    className="notes-tag-search-clear"
                    onClick={() => setTagSearch("")}
                    title="Clear tag search"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
              <div
                className={`notes-tag-item${filterType === "all" ? " active" : ""}`}
                onClick={() => {
                  setFilterType("all");
                  setSelectedTag(null);
                }}
              >
                <span className="notes-tag-name">
                  <i className="fa-regular fa-folder-open"></i> All notes
                </span>
                <span className="notes-tag-count">{notes.length}</span>
              </div>
              <div
                className={`notes-tag-item${filterType === "pinned" ? " active" : ""}`}
                onClick={() => {
                  setFilterType("pinned");
                  setSelectedTag(null);
                }}
              >
                <span className="notes-tag-name">
                  <i className="fa-solid fa-thumbtack"></i> Pinned Notes
                </span>
                <span className="notes-tag-count">
                  {notes.filter((n) => n.isPinned).length}
                </span>
              </div>
              <div
                className={`notes-tag-item${filterType === "unpinned" ? " active" : ""}`}
                onClick={() => {
                  setFilterType("unpinned");
                  setSelectedTag(null);
                }}
              >
                <span className="notes-tag-name">
                  <i className="fa-regular fa-note-sticky"></i> Unpinned Notes
                </span>
                <span className="notes-tag-count">
                  {notes.filter((n) => !n.isPinned).length}
                </span>
              </div>
              {filteredTags.map(([tag, count]) => (
                <div
                  key={tag}
                  className={`notes-tag-item${filterType === "tag" && selectedTag === tag ? " active" : ""}`}
                  onClick={() => {
                    if (filterType === "tag" && selectedTag === tag) {
                      setFilterType("all");
                      setSelectedTag(null);
                    } else {
                      setFilterType("tag");
                      setSelectedTag(tag);
                    }
                  }}
                >
                  <span className="notes-tag-name">
                    <i className="fa-solid fa-tag"></i> {tag}
                  </span>
                  <span className="notes-tag-count">{count}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Main content area */}
          <div className="notes-main-content-area" ref={containerRef}>

            {loading ? (
              <div className="note-grid-skeleton">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="note-grid-card-skeleton skeleton-loader"></div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
                <i className="fa-regular fa-note-sticky" style={{ fontSize: "3rem", color: "var(--text-muted)", marginBottom: "1rem", opacity: 0.5 }}></i>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>No notes yet. Click the "+" button to get started.</p>
              </div>
            ) : (
              <div className="notes-sections-wrapper" style={{ display: "flex", flexDirection: "column", gap: "2rem", flex: 1 }}>
                {selectedIds.length > 0 && (
                  <div className="notes-select-all-header" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                    <button
                      type="button"
                      className="task-select-all-btn-wrapper"
                      onClick={handleSelectAllToggle}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-teal)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      <i className={selectedIds.length === allVisibleNotes.length ? "fa-solid fa-circle-check" : "fa-regular fa-circle"}></i>
                      Select All ({allVisibleNotes.length} notes)
                    </button>
                  </div>
                )}

                {filterType !== "pinned" && pinnedNotesForSection.length > 0 && (
                  <div className="notes-section pinned-section">
                    <h3 className="notes-section-title" style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--accent-teal)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "1.25rem",
                      marginTop: 0
                    }}>
                      <i className="fa-solid fa-thumbtack"></i> Pinned Notes
                    </h3>
                    <NoteGrid
                      notes={pinnedNotesForSection}
                      onSelect={(note, mode) => openNote(note, isGhost ? "preview" : (mode || "preview"))}
                      onTogglePin={togglePin}
                      onDelete={deleteNote}
                      isPinnedRow={true}
                      cardWidth={cardWidth}
                      cols={cols}
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      selectionActive={selectedIds.length > 0}
                    />
                  </div>
                )}

                {sortedFilteredNotes.length > 0 && (
                  <div className="notes-section" style={filterType !== "pinned" && pinnedNotesForSection.length > 0 ? { borderTop: "1px solid var(--border)", paddingTop: "1.5rem" } : {}}>
                    <NoteGrid
                      notes={sortedFilteredNotes}
                      onSelect={(note, mode) => openNote(note, isGhost ? "preview" : (mode || "preview"))}
                      onTogglePin={togglePin}
                      onDelete={deleteNote}
                      cardWidth={cardWidth}
                      cols={cols}
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      selectionActive={selectedIds.length > 0}
                    />
                  </div>
                )}
              </div>
            )}

            {selectedIds.length > 0 && (
              <div className="batch-bar-container">
                <div className="batch-bar">
                  <span className="batch-count">
                    <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "note" : "notes"} selected
                  </span>
                  <div className="batch-actions">
                    <Button variant="secondary" icon="fa-solid fa-thumbtack" onClick={handleBatchPin}>Pin</Button>
                    <Button variant="secondary" icon="fa-solid fa-thumbtack" onClick={handleBatchUnpin}>Unpin</Button>
                    <Button variant="danger" icon="fa-regular fa-trash-can" onClick={handleBatchDelete}>Delete</Button>
                    <button
                      type="button"
                      className="batch-cancel"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Version Revisions Modal ── */}
      {showRevisionsModal && (
        <Modal title="Version History" onClose={() => setShowRevisionsModal(false)} width="600px">
          {revisionsLoading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading revisions...</div>
          ) : revisions.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <i className="fa-solid fa-history" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}></i>
              <p>No previous versions saved yet. Auto-saves occur when changes are made.</p>
            </div>
          ) : (
            <div className="revisions-panel">
              {revisions.map((rev) => (
                <div key={rev._id} className="revision-item" onClick={() => handlePreviewRevision(rev)}>
                  <div className="revision-details">
                    <span className="revision-time">
                      {new Date(rev.savedAt).toLocaleString()}
                    </span>
                    <span className="revision-meta">
                      Title: {rev.title || "Untitled"} | {rev.content ? stripHtml(rev.content).slice(0, 50) + "..." : "Empty"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestoreRevision(rev._id);
                    }}
                    style={{ height: '32px', padding: '0 0.75rem' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Revision Preview Modal ── */}
      {previewRevision && (
        <Modal 
          title={`Preview Version - ${new Date(previewRevision.savedAt).toLocaleString()}`} 
          onClose={() => setPreviewRevision(null)}
          width="600px"
          footer={
            <div style={{ display: "flex", gap: "0.55rem", justifyContent: "flex-end", width: "100%" }}>
              <Button variant="secondary" onClick={() => setPreviewRevision(null)}>Close Preview</Button>
              <Button variant="primary" onClick={() => {
                handleRestoreRevision(previewRevision._id);
                setPreviewRevision(null);
              }}>Restore this Version</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label className="field-label">Title</label>
              <input className="input" type="text" value={previewRevision.title} readOnly style={{ background: 'var(--bg-input)' }} />
            </div>
            {previewRevision.subheading && (
              <div className="field-group">
                <label className="field-label">Subheading</label>
                <input className="input" type="text" value={previewRevision.subheading} readOnly style={{ background: 'var(--bg-input)' }} />
              </div>
            )}
            <div className="field-group">
              <label className="field-label">Content Preview</label>
              <div className="revision-preview-diff-box" dangerouslySetInnerHTML={{ __html: parseMarkdown(previewRevision.content) }} />
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

      {/* ── Editor panel (slides in from right) ────── */}
      <div ref={editorRef} className={`notes-editor-panel${view === "editor" ? " open" : ""}`}>
        <div className="notes-editor-topbar">
          <button className="notes-editor-back" onClick={closeEditor} title="Back to notes">
            <i className="fa-solid fa-arrow-left"></i>
            All notes
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {activeNote && (
                <>
                  <div ref={exportDropdownRef} style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      className="notes-editor-export" 
                      onClick={() => setExportDropdownOpen(!exportDropdownOpen)} 
                      title="Export options"
                    >
                      <i className="fa-solid fa-file-export"></i> Export <i className="fa-solid fa-caret-down" style={{ fontSize: '0.75rem', marginLeft: '0.15rem' }}></i>
                    </button>
                    {exportDropdownOpen && (
                      <div className="color-picker-popover" style={{ width: '180px', top: 'calc(100% + 4px)', padding: '0.5rem 0', gap: 0, right: 0 }}>
                        <button type="button" className="notes-tag-item" style={{ borderRadius: 0, padding: '0.6rem 1rem', width: '100%', border: 'none', background: 'none' }} onClick={() => { handleExportPDF(); setExportDropdownOpen(false); }}>
                          <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginRight: '0.55rem' }}></i> PDF Document
                        </button>
                        <button type="button" className="notes-tag-item" style={{ borderRadius: 0, padding: '0.6rem 1rem', width: '100%', border: 'none', background: 'none' }} onClick={() => { handleExportMarkdown(); setExportDropdownOpen(false); }}>
                          <i className="fa-solid fa-file-code" style={{ color: '#0ea98a', marginRight: '0.55rem' }}></i> Markdown (.md)
                        </button>
                        <button type="button" className="notes-tag-item" style={{ borderRadius: 0, padding: '0.6rem 1rem', width: '100%', border: 'none', background: 'none' }} onClick={() => { handleExportHTML(); setExportDropdownOpen(false); }}>
                          <i className="fa-solid fa-file-lines" style={{ color: '#3b82f6', marginRight: '0.55rem' }}></i> HTML Document
                        </button>
                        <button type="button" className="notes-tag-item" style={{ borderRadius: 0, padding: '0.6rem 1rem', width: '100%', border: 'none', background: 'none' }} onClick={() => { handleExportTXT(); setExportDropdownOpen(false); }}>
                          <i className="fa-solid fa-file-text" style={{ color: '#6b7280', marginRight: '0.55rem' }}></i> Plain Text (.txt)
                        </button>
                        <button type="button" className="notes-tag-item" style={{ borderRadius: 0, padding: '0.6rem 1rem', width: '100%', border: 'none', background: 'none' }} onClick={() => { handleExportJSON(); setExportDropdownOpen(false); }}>
                          <i className="fa-solid fa-code" style={{ color: '#f59e0b', marginRight: '0.55rem' }}></i> Raw JSON (.json)
                        </button>
                      </div>
                    )}
                  </div>
                  <button type="button" className="notes-editor-export" onClick={openRevisions} title="Version History">
                    <i className="fa-solid fa-history"></i> History
                  </button>
                </>
              )}
            </div>
            <span className="notes-editor-status">
              {saveState === "saving" && (
                <span className="saving-spinner-text">
                  <span className="saving-pulse"></span>
                  Saving...
                </span>
              )}
              {saveState === "saved" && <span className="save-success">Saved ✓</span>}
              {saveState === "idle" && (
                <span style={{ color: "var(--text-muted)" }}>
                  {activeNote ? "All changes saved" : "Draft"}
                </span>
              )}
            </span>
          </div>

        </div>

        <form 
          className="note-form" 
          onSubmit={handleSubmit}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{ position: 'relative' }}
        >
          {dragActive && (
            <div className="editor-drop-overlay">
              <i className="fa-solid fa-file-arrow-up"></i>
              <p>Drop your Markdown (.md) file here to import</p>
            </div>
          )}
            <NoteHeader
              title={title}
              onTitleChange={setTitle}
              subheading={subheading}
              onSubheadingChange={setSubheading}
              tags={tags}
              onTagsChange={setTags}
              readOnly={editorMode === "preview"}
              availableTags={allUserTags}
              extraTagControl={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
                   {/* {isSpeechSupported && editorMode !== "preview" && (
                     <button
                       type="button"
                       className={`notes-editor-export ${isRecording ? "recording" : ""}`}
                       onClick={toggleDictation}
                       title={isRecording ? "Stop recording" : "Speech to Text"}
                       style={{ height: '36px', padding: '0 0.65rem' }}
                     >
                       <i className={`fa-solid ${isRecording ? "fa-microphone-lines" : "fa-microphone"}`}></i>
                       {isRecording ? "Listening..." : "Dictate"}
                     </button>
                   )} */}

                  <button
                    type="button"
                    className="note-color-button note-color-button-inline"
                    title={editorMode === "preview" ? "Color changes are not allowed in preview mode" : "Note color"}
                    onClick={() => editorMode !== "preview" && setColorPickerOpen((v) => !v)}
                    style={{
                      background: resolveAccentValue(accent),
                      cursor: editorMode === "preview" ? "not-allowed" : "pointer",
                      opacity: editorMode === "preview" ? 0.65 : 1
                    }}
                  />
                {colorPickerOpen && (
                  <div className="color-picker-popover" ref={colorPickerRef}>
                    <HexColorPicker color={resolveAccentValue(accent)} onChange={(c) => handleAccentChange(c)} />
                    <div className="color-swatches">
                      {ACCENTS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          className="color-swatch"
                          style={{ background: resolveAccentValue(a) }}
                          onClick={() => handleAccentChange(a)}
                          title={a}
                        />
                      ))}
                    </div>

                    <div className="custom-swatches">
                      {customColors.map((c, idx) => {
                        const isFilled = Boolean(c);
                        const swatchColor = isFilled ? (c.startsWith('var(') ? resolveAccentValue(c) : c) : 'transparent';
                        return (
                          <div key={idx} className="custom-swatch-container">
                            <button
                              type="button"
                              className={`custom-swatch${isFilled ? " filled" : " empty"}`}
                              style={{ background: swatchColor }}
                              onClick={() => {
                                if (isFilled) {
                                  handleAccentChange(c);
                                } else {
                                  saveCustomColorSlot(idx);
                                }
                              }}
                              title={isFilled ? `Use ${c}` : 'Click to save current color'}
                            >
                              {!isFilled && <i className="fa-solid fa-plus custom-swatch-plus"></i>}
                            </button>
                            {isFilled && (
                              <button
                                type="button"
                                className="custom-swatch-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearCustomColorSlot(idx);
                                }}
                                title="Delete color"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            }
          />

          <RichTextEditor
            value={content}
            onChange={setContent}
            mode={editorMode}
            onModeChange={setEditorMode}
          />

          <div className="form-footer">
            <span className="char-hint">
              {editorMode === "preview"
                ? "Preview mode — click Edit to make changes."
                : "Keep it clear, keep it useful."}
            </span>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {activeNote && (
                <Button type="button" variant="danger" onClick={() => deleteNote(activeNote)}>
                  Delete
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editorMode === "preview"
                    ? "Edit Note"
                    : "Save Now"}
                {!saving && <span className="btn-arrow">→</span>}
              </Button>
            </div>
            </div>
          </form>

        <FloatingAIIcon 
          value={content} 
          onUpdateContent={setContent} 
          contentType="markdown" 
        />
        
      </div>
    </div>
  );
};

export default NotesPage;