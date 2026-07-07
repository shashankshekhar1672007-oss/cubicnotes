import React from "react";

/**
 * Reusable Google Gemini Sparkle Icon (two nested sparkles).
 */
const GeminiIcon = ({ className = "", size = 24, style = {} }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        ...style
      }}
    >
      {/* Main Sparkle */}
      <path d="M9 5 Q9 13 17 13 Q9 13 9 21 Q9 13 1 13 Q9 13 9 5 Z" />
      {/* Secondary Sparkle */}
      <path d="M17 3 Q17 7 21 7 Q17 7 17 11 Q17 7 13 7 Q17 7 17 3 Z" />
    </svg>
  );
};

export default GeminiIcon;
