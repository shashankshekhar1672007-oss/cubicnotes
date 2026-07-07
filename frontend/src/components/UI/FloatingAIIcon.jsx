import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import GeminiIcon from "./GeminiIcon";
import { useGhostGuard } from "../../hooks/useGhostGuard";
import "./FloatingAIIcon.css";
import { toast } from "react-hot-toast";

// Helper to convert Tiptap JSON schema structure to HTML (lightweight)
const tiptapToHTML = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (node.type === "text") {
    let text = node.text || "";
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        if (mark.type === "italic") text = `<em>${text}</em>`;
        if (mark.type === "underline") text = `<u>${text}</u>`;
        if (mark.type === "code") text = `<code>${text}</code>`;
      });
    }
    return text;
  }

  const contentHTML = Array.isArray(node.content)
    ? node.content.map(tiptapToHTML).join("")
    : "";

  switch (node.type) {
    case "doc":
      return contentHTML;
    case "paragraph":
      return `<p>${contentHTML}</p>`;
    case "heading": {
      const level = node.attrs?.level || 1;
      return `<h${level}>${contentHTML}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${contentHTML}</blockquote>`;
    case "bulletList":
      return `<ul>${contentHTML}</ul>`;
    case "orderedList":
      return `<ol>${contentHTML}</ol>`;
    case "listItem":
      return `<li>${contentHTML}</li>`;
    default:
      return contentHTML;
  }
};

// Convert plain text paragraphs into HTML paragraphs for Tiptap
const textToHTML = (text) => {
  if (!text) return "";
  return text
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
};

// Simple text-extraction helper
const extractRawText = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) return node.content.map(extractRawText).join(" ");
  if (Array.isArray(node)) return node.map(extractRawText).join(" ");
  if (typeof node === "object") return Object.values(node).map(extractRawText).join(" ");
  return "";
};

const FloatingAIIcon = ({ value, onUpdateContent, contentType = "markdown" }) => {
  const navigate = useNavigate();
  const { guardAction, isGhost } = useGhostGuard();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("generate"); // generate | summarize | complete | rephrase
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  
  // Credits info
  const [credits, setCredits] = useState({ aiCredits: 5, hasCustomKey: false });

  const widgetRef = useRef(null);
  const ocrFileInputRef = useRef(null);

  const handleOcrUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file.");
        return;
      }

      setLoading(true);
      const loadingToast = toast.loading("Processing image text via Gemini OCR...");

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result.split(",")[1];
          try {
            const { data } = await api.post("/ai/ocr", {
              imageBase64: base64Data,
              mimeType: file.type
            });

            if (data.text) {
              setResult(data.text);
              toast.success("Text extracted successfully!");
              if (data.creditsLeft !== undefined) {
                setCredits(prev => ({ 
                  ...prev, 
                  aiCredits: data.creditsLeft, 
                  hasCustomKey: data.usingCustomKey 
                }));
              }
            } else {
              toast.error("No text could be extracted.");
            }
          } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to process OCR request.");
          } finally {
            setLoading(false);
            toast.dismiss(loadingToast);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(err);
        toast.error("Failed to read image file.");
        setLoading(false);
        toast.dismiss(loadingToast);
      }
    }
  };

  // Close widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fetch credits info when opening
  const fetchCredits = async () => {
    if (isGhost) return;
    try {
      const { data } = await api.get("/ai/settings");
      setCredits(data);
    } catch (err) {
      console.error("Failed to fetch AI credits", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCredits();
    }
  }, [isOpen]);

  const handleAction = async (actionType) => {
    setLoading(true);
    setResult("");
    
    // Retrieve actual text content context
    let plainTextContext = "";
    if (contentType === "tiptap") {
      plainTextContext = extractRawText(value);
    } else {
      plainTextContext = value || "";
    }

    try {
      if (actionType === "summarize") {
        if (!plainTextContext.trim()) {
          toast.error("Editor is empty. Write something first to summarize!");
          setLoading(false);
          return;
        }
        const { data } = await api.post("/ai/summarize", { text: plainTextContext });
        setResult(data.summary);
        if (data.creditsLeft !== undefined) {
          setCredits(prev => ({ ...prev, aiCredits: data.creditsLeft, hasCustomKey: data.usingCustomKey }));
        }
      } else if (actionType === "complete") {
        if (!plainTextContext.trim()) {
          toast.error("Editor is empty. Write something first so AI can continue!");
          setLoading(false);
          return;
        }
        const { data } = await api.post("/ai/complete", { text: plainTextContext });
        setResult(data.completion);
        if (data.creditsLeft !== undefined) {
          setCredits(prev => ({ ...prev, aiCredits: data.creditsLeft, hasCustomKey: data.usingCustomKey }));
        }
      } else if (actionType === "generate" || actionType === "rephrase") {
        if (!prompt.trim()) {
          toast.error("Please describe what you want the AI to write.");
          setLoading(false);
          return;
        }
        const endpoint = "/ai/generate";
        const { data } = await api.post(endpoint, {
          prompt: actionType === "rephrase" ? `Rephrase/Improve the text based on: ${prompt}` : prompt,
          context: plainTextContext
        });
        setResult(data.text);
        if (data.creditsLeft !== undefined) {
          setCredits(prev => ({ ...prev, aiCredits: data.creditsLeft, hasCustomKey: data.usingCustomKey }));
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "AI action failed");
    } finally {
      setLoading(false);
    }
  };

  // Insert generated content
  const handleInsert = (mode) => {
    if (!result) return;
    
    if (contentType === "tiptap") {
      // Split paragraphs and map to Tiptap text/paragraph nodes
      const newParagraphs = result
        .split("\n\n")
        .map((paragraphText) => {
          if (!paragraphText.trim()) return null;
          return {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: paragraphText
              }
            ]
          };
        })
        .filter(Boolean);

      if (mode === "append") {
        let originalJSON = null;
        if (value) {
          if (typeof value === "string") {
            try {
              originalJSON = JSON.parse(value);
            } catch (e) {
              originalJSON = { type: "doc", content: [] };
            }
          } else {
            originalJSON = JSON.parse(JSON.stringify(value));
          }
        } else {
          originalJSON = { type: "doc", content: [] };
        }

        if (originalJSON && Array.isArray(originalJSON.content)) {
          originalJSON.content.push(...newParagraphs);
        } else {
          originalJSON.content = newParagraphs;
        }

        onUpdateContent(originalJSON);
        toast.success("Inserted content at end!");
      } else if (mode === "replace") {
        const replacementJSON = {
          type: "doc",
          content: newParagraphs
        };
        onUpdateContent(replacementJSON);
        toast.success("Content replaced!");
      }
    } else {
      const currentText = value || "";
      if (mode === "append") {
        onUpdateContent(currentText ? `${currentText}\n\n${result}` : result);
        toast.success("Appended to note!");
      } else if (mode === "replace") {
        onUpdateContent(result);
        toast.success("Note content replaced!");
      }
    }
    
    setResult("");
    setPrompt("");
    setIsOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="floating-ai-widget-container" ref={widgetRef}>
      {/* Sleek Floating Trigger Button */}
      <button 
        className={`floating-ai-btn ${isOpen ? "open" : ""}`}
        onClick={() => guardAction(() => setIsOpen(!isOpen))}
        title="CubicNotes AI Assistant"
      >
        <GeminiIcon size={20} />
      </button>

      {/* Modern Popover Box */}
      {isOpen && (
        <div className="floating-ai-popover">
          <div className="ai-popover-header">
            <div className="ai-header-title">
              <GeminiIcon size={16} style={{ marginRight: "0.2rem" }} />
              <span>CubicNotes AI</span>
            </div>
            <button className="ai-popover-close-btn" onClick={() => setIsOpen(false)}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          {!result && !loading && (
            <div className="ai-popover-body">
              {/* Action Tabs/Chips */}
              <div className="ai-action-chips">
                <button 
                  className={`ai-chip ${activeTab === "generate" ? "active" : ""}`}
                  onClick={() => { setActiveTab("generate"); setPrompt(""); }}
                >
                  <i className="fa-solid fa-pen-nib"></i> Write
                </button>
                <button 
                  className={`ai-chip ${activeTab === "summarize" ? "active" : ""}`}
                  onClick={() => { setActiveTab("summarize"); handleAction("summarize"); }}
                >
                  <i className="fa-solid fa-align-left"></i> Summarize
                </button>
                <button 
                  className={`ai-chip ${activeTab === "complete" ? "active" : ""}`}
                  onClick={() => { setActiveTab("complete"); handleAction("complete"); }}
                >
                  <i className="fa-solid fa-forward"></i> Complete
                </button>
                <button 
                  className={`ai-chip ${activeTab === "rephrase" ? "active" : ""}`}
                  onClick={() => { setActiveTab("rephrase"); setPrompt(""); }}
                >
                  <i className="fa-solid fa-rotate"></i> Rephrase
                </button>
                <button 
                  className={`ai-chip ${activeTab === "ocr" ? "active" : ""}`}
                  onClick={() => { setActiveTab("ocr"); setPrompt(""); }}
                >
                  <i className="fa-solid fa-file-image"></i> Scan Image
                </button>
              </div>

              {/* Input for Generate or Rephrase */}
              {(activeTab === "generate" || activeTab === "rephrase") && (
                <div className="ai-input-area animate-fade-in">
                  <textarea
                    placeholder={
                      activeTab === "rephrase" 
                        ? "How should I rephrase the text? (e.g. make it professional, make it concise)" 
                        : "Describe what you want to write..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="ai-widget-textarea"
                  />
                  <button 
                    onClick={() => handleAction(activeTab)}
                    disabled={!prompt.trim()}
                    className="ai-widget-run-btn"
                  >
                    <span>Generate</span>
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
              )}

              {activeTab === "ocr" && (
                <div className="ai-input-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 0.5rem' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--accent-teal)', marginBottom: '0.25rem' }}></i>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
                    Upload an image to extract text using Gemini AI OCR
                  </p>
                  
                  <button 
                    type="button"
                    onClick={() => ocrFileInputRef.current?.click()}
                    className="ai-widget-run-btn"
                    style={{ width: 'auto', padding: '0.5rem 1rem' }}
                    disabled={loading}
                  >
                    <i className="fa-solid fa-image"></i>
                    <span>Select Image</span>
                  </button>

                  <input
                    type="file"
                    ref={ocrFileInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleOcrUpload}
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="ai-popover-loading">
              <div className="ai-pulse-ring">
                <GeminiIcon size={24} />
              </div>
              <p>Gemini is weaving text...</p>
            </div>
          )}

          {/* Results Preview */}
          {result && !loading && (
            <div className="ai-popover-result animate-fade-in">
              <div className="ai-result-actions-top">
                <span>Preview Output</span>
                <button className="ai-result-copy-btn" onClick={handleCopy} title="Copy to Clipboard">
                  <i className="fa-solid fa-copy"></i>
                </button>
              </div>
              <div className="ai-result-scroll">
                <pre>{result}</pre>
              </div>
              <div className="ai-result-actions-bottom">
                <button className="ai-result-btn primary" onClick={() => handleInsert("append")}>
                  <i className="fa-solid fa-plus"></i> Append
                </button>
                <button className="ai-result-btn secondary" onClick={() => handleInsert("replace")}>
                  <i className="fa-solid fa-rotate"></i> Replace Content
                </button>
                <button className="ai-result-btn text-only" onClick={() => setResult("")}>
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Footer - Credit display & API Settings trigger */}
          <div className="ai-popover-footer">
            <span className="ai-footer-credits">
              <i className="fa-solid fa-coins"></i>
              {credits.hasCustomKey ? "Unlimited (Custom Key)" : `${credits.aiCredits} actions left`}
            </span>
            <button className="ai-footer-settings-btn" onClick={() => { navigate("/settings", { state: { tab: "ai" } }); setIsOpen(false); }}>
              <i className="fa-solid fa-cog"></i> Key Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingAIIcon;
