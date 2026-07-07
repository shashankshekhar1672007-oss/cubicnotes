import React, { useState } from "react";
import api from "../../services/api";
import "./AIActionModal.css";
import { toast } from "react-hot-toast";

/**
 * Reusable modal for AI actions (summarize, complete, write).
 * The parent provides the action type and receives the result via onResult.
 */
const AIActionModal = ({ isOpen, onClose, actionType, onResult }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleRun = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      let endpoint = "/ai/complete";
      if (actionType === "summarize") endpoint = "/ai/summarize";
      const { data } = await api.post(endpoint, { text: input });
      const output = actionType === "summarize" ? data.summary : data.completion;
      setResult(output);
      onResult && onResult(output);
    } catch (err) {
      toast.error(err?.response?.data?.message || "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error("Copy failed");
    }
  };

  if (!isOpen) return null;

  const titleMap = {
    summarize: "Summarize Text",
    complete: "Complete Text",
    write: "Generate Content",
  };

  return (
    <div className="ai-action-backdrop" onClick={onClose}>
      <div className="ai-action-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{titleMap[actionType] || "AI Action"}</h2>
        <textarea
          className="ai-action-input"
          placeholder="Enter text or prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
        />
        <div className="ai-action-buttons">
          <button onClick={handleRun} disabled={loading} className="ai-action-run-btn">
            {loading ? "Processing…" : "Run"}
          </button>
          <button onClick={onClose} className="ai-action-cancel-btn">
            Cancel
          </button>
        </div>
        {result && (
          <div className="ai-action-result">
            <pre>{result}</pre>
            <button onClick={handleCopy} className="ai-action-copy-btn">
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIActionModal;
