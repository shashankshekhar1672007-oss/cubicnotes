import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { NOTE_TEMPLATES, getFormattedTemplate } from "../../data/templates";
import { parseMarkdown } from "../../utils/parseMarkdown";

const TemplateSelectorModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedId, setSelectedId] = useState("blank");

  if (!isOpen) return null;

  const currentRaw = NOTE_TEMPLATES.find((t) => t.id === selectedId) || NOTE_TEMPLATES[0];
  const currentFormatted = getFormattedTemplate(currentRaw);

  const handleUseTemplate = () => {
    onSelect(currentFormatted);
    onClose();
  };

  return (
    <Modal
      title="Create from Template"
      onClose={onClose}
      width="800px"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Need more templates? Browse {" "}
            <a 
              href="https://mdkit.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: "var(--accent-teal)", textDecoration: "underline", fontWeight: 500 }}
            >
              mdkit.io
            </a>
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUseTemplate}>
              {selectedId === "blank" ? "Start Blank" : "Use Template"}
            </Button>
          </div>
        </div>
      }
    >
      <div 
        className="template-selector-container" 
        style={{ 
          display: "flex", 
          gap: "1.25rem", 
          height: "420px", 
          maxHeight: "60vh",
          overflow: "hidden"
        }}
      >
        {/* Left Pane: Templates Menu */}
        <div 
          className="template-sidebar scroll-thin" 
          style={{ 
            width: "35%", 
            borderRight: "1px solid var(--border)", 
            paddingRight: "0.75rem", 
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem"
          }}
        >
          {NOTE_TEMPLATES.map((tmpl) => {
            const isActive = tmpl.id === selectedId;
            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedId(tmpl.id)}
                className={`template-menu-item`}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  background: isActive ? "rgba(14, 169, 138, 0.08)" : "transparent",
                  border: isActive ? "1px solid var(--accent-teal)" : "1px solid transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <div 
                  style={{ 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "6px", 
                    background: isActive ? tmpl.color : "var(--bg-input)", 
                    color: isActive ? "#ffffff" : "var(--text-secondary)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "0.9rem"
                  }}
                >
                  <i className={`fa-solid ${tmpl.icon}`}></i>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {tmpl.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Pane: Live Preview */}
        <div 
          className="template-preview scrollbar-custom" 
          style={{ 
            width: "65%", 
            overflowY: "auto", 
            paddingLeft: "0.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          {selectedId === "blank" ? (
            <div 
              style={{ 
                height: "100%", 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "center", 
                alignItems: "center", 
                textAlign: "center",
                color: "var(--text-muted)" 
              }}
            >
              <i className="fa-regular fa-file" style={{ fontSize: "3.5rem", marginBottom: "1rem" }}></i>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)" }}>Blank Canvas</h3>
              <p style={{ fontSize: "0.85rem", maxWidth: "260px", marginTop: "0.25rem" }}>
                Start writing from scratch without any layout templates.
              </p>
            </div>
          ) : (
            <>
              <div 
                style={{ 
                  borderBottom: "1px solid var(--border)", 
                  paddingBottom: "0.75rem"
                }}
              >
                <span 
                  style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: 600, 
                    color: "white", 
                    background: currentFormatted.color,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    textTransform: "uppercase"
                  }}
                >
                  Template Preview
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {currentFormatted.title}
                </h3>
                {currentFormatted.subheading && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.25rem 0 0" }}>
                    {currentFormatted.subheading}
                  </p>
                )}
                {currentFormatted.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                    {currentFormatted.tags.map(t => (
                      <span key={t} style={{ fontSize: "0.75rem", background: "var(--bg-input)", color: "var(--text-muted)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div 
                className="template-body-preview"
                style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(currentFormatted.content) }}
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TemplateSelectorModal;
