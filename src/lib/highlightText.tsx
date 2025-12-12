import type { ReactNode } from "react";

/**
 * Highlights matching parts of text by wrapping them in <mark> elements.
 * Case-insensitive matching.
 *
 * @param text - The full text to display
 * @param query - The search query to highlight
 * @returns ReactNode with highlighted portions wrapped in <mark>
 */
export function highlightMatchingText(text: string, query: string): ReactNode {
  if (!query.trim()) {
    return text;
  }

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    // No match found
    return text;
  }

  return parts.map((part, index) => {
    // Check if this part matches the query (case-insensitive)
    const isMatch = part.toLowerCase() === query.toLowerCase();
    
    return isMatch ? (
      <mark
        key={index}
        className="bg-transparent font-semibold text-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    );
  });
}

