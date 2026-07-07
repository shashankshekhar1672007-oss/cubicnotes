import { useState, useEffect, useRef, useMemo } from "react";

const PRE_FED_TAGS = [
  "work", "personal", "ideas", "urgent", "studies", "university",
  "groceries", "recipes", "diary", "thoughts"
];

/**
 * Title input + optional subheading input + custom tag suggestions input for the note editor.
 */
const NoteHeader = ({
  title,
  onTitleChange,
  subheading,
  onSubheadingChange,
  tags = [],
  onTagsChange,
  readOnly = false,
  extraTagControl = null,
  availableTags = [],
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveTag = (tagToRemove) => {
    if (readOnly) return;
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddTag = (tagToAdd) => {
    if (readOnly) return;
    const cleanTag = tagToAdd.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      onTagsChange([...tags, cleanTag]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent note form submit
      if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    }
  };

  // Combine pre-fed tags and user's custom tags, removing duplicates
  const allSuggestions = useMemo(() => {
    const combined = [...availableTags, ...PRE_FED_TAGS];
    return Array.from(new Set(combined.map((t) => t.trim().toLowerCase())));
  }, [availableTags]);

  // Filter tag suggestions based on input value
  const filteredSuggestions = allSuggestions.filter(
    (tag) =>
      tag.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(tag)
  );

  // Show "Add custom tag" option if user types something not matching existing suggestions
  const showCustomOption =
    inputValue.trim() &&
    !allSuggestions.includes(inputValue.trim().toLowerCase()) &&
    !tags.includes(inputValue.trim().toLowerCase());

  return (
    <>
      {/* Title */}
      <div className="field-group">
        <label className="field-label" htmlFor="note-title">Title</label>
        <input
          id="note-title"
          type="text"
          className="note-heading-input"
          placeholder="Give your note a title..."
          value={title}
          readOnly={readOnly}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {/* Subheading (Optional) */}
      <div className="field-group">
        <label className="field-label" htmlFor="note-subheading">Subheading (optional)</label>
        <input
          id="note-subheading"
          type="text"
          className="input"
          placeholder="Add a subtitle or summary description..."
          value={subheading}
          readOnly={readOnly}
          onChange={(e) => onSubheadingChange(e.target.value)}
        />
      </div>

      {/* Tags Custom Multiselect */}
      <div className="field-group" ref={containerRef}>
        <label className="field-label">Tags</label>
        <div className="tags-input-row">
          <div className={`tags-input-container${readOnly ? " read-only" : ""}`}>
            {/* Selected tag pills */}
            {tags.map((tag) => (
              <span key={tag} className="tag-editor-pill">
                #{tag}
                {!readOnly && (
                  <button
                    type="button"
                    className="tag-editor-pill-remove"
                    onClick={() => handleRemoveTag(tag)}
                    title={`Remove ${tag}`}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </span>
            ))}

            {/* Typing field */}
            <input
              type="text"
              className="tags-input-field"
              placeholder={tags.length === 0 ? "Click to add tags..." : "Add tag..."}
              value={inputValue}
              disabled={readOnly}
              onFocus={() => !readOnly && setShowDropdown(true)}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {showDropdown && !readOnly && (filteredSuggestions.length > 0 || showCustomOption) && (
              <div className="tags-suggestions-dropdown">
                {filteredSuggestions.map((tag) => (
                  <div
                    key={tag}
                    className="tags-suggestion-item"
                    onClick={() => handleAddTag(tag)}
                  >
                    <span>#{tag}</span>
                    <span className="suggestion-check">
                      <i className="fa-solid fa-plus"></i>
                    </span>
                  </div>
                ))}
                {showCustomOption && (
                  <div
                    className="tags-suggestion-item"
                    onClick={() => handleAddTag(inputValue)}
                    style={{ borderTop: "1px dashed var(--border)" }}
                  >
                    <span>Add custom tag: <strong>#{inputValue.trim().toLowerCase()}</strong></span>
                    <span className="suggestion-check">
                      <i className="fa-solid fa-plus"></i>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {extraTagControl && <div className="tags-input-adjacent">{extraTagControl}</div>}
        </div>
      </div>
    </>
  );
};

export default NoteHeader;
