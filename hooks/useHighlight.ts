import { useEffect, useState, useRef } from "react";

export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

interface UseHighlightArgs {
  enabled: boolean;
  sourceText: string;
  debounceMs?: number;
}

export function useHighlight({ enabled, sourceText, debounceMs = 600 }: UseHighlightArgs) {
  const [segments, setSegments] = useState<HighlightSegment[]>([]);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) {
      setSegments([]);
      setKeyPoints([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!sourceText.trim()) {
      setSegments([]);
      setKeyPoints([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sourceText })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || "Highlight failed");
        setSegments(json?.segments || []);
        setKeyPoints(json?.keyPoints || []);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setSegments([]);
        setKeyPoints([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, sourceText, debounceMs]);

  return { segments, keyPoints, loading, error };
}