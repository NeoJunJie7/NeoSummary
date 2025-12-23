import React from "react";
import { HighlightSegment } from "../hooks/useHighlight";

interface Props {
  segments: HighlightSegment[];
}

export const HighlightedText: React.FC<Props> = ({ segments }) => {
  if (!segments.length) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        padding: 15,
        whiteSpace: "pre-wrap",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
        lineHeight: "1.4",
        pointerEvents: "none",
        userSelect: "none",
        color: "transparent",
        // helps the yellow blend with text below without hiding caret
        mixBlendMode: "multiply"
      }}
    >
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{
            backgroundColor: seg.highlight ? "rgba(255,230,140,0.85)" : "transparent",
            padding: seg.highlight ? "2px 3px" : undefined,
            borderRadius: seg.highlight ? 3 : undefined,
            // keep same weight as the textarea to avoid reflow
            fontWeight: 400,
            color: "transparent"
          }}
        >
          {seg.text + " "}
        </span>
      ))}
    </div>
  );
};