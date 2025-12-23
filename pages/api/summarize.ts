import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: true } };

const MODEL = "facebook/bart-large-cnn";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, length } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });

  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing HF_API_KEY" });

  // normalize noisy PDF/DOCX text
  const cleaned = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const targetWords = clamp(typeof length === "number" ? length : 250, 50, 800);

  try {
    const chunks = splitIntoChunks(cleaned, 2500); // ~safe window for BART
    const partials: string[] = [];
    for (const c of chunks) {
      partials.push(await summarizeChunk({ apiKey, input: c, targetWords }));
    }

    let summary = partials.join(" ");
    // second pass to tighten if we had multiple chunks
    if (partials.length > 1) {
      summary = await summarizeChunk({ apiKey, input: summary, targetWords });
    }

    summary = postClean(summary);
    return res.status(200).json({ summary });
  } catch (e: any) {
    console.error("summarize error:", e);
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function splitIntoChunks(t: string, maxChars = 2500): string[] {
  if (t.length <= maxChars) return [t];
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    const slice = t.slice(i, i + maxChars);
    let end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
    if (end < maxChars * 0.4) end = slice.length;
    out.push(slice.slice(0, end).trim());
    i += end;
  }
  return out.filter(Boolean);
}

function postClean(t: string): string {
  return t
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/(\.)\s*(\.)+/g, ".")
    .replace(/\s+,/g, ",")
    .trim();
}

async function summarizeChunk(opts: { apiKey: string; input: string; targetWords: number }): Promise<string> {
  const approxTokens = Math.round(opts.targetWords * 1.35);
  const max_new_tokens = clamp(approxTokens + 60, 120, 1500);
  const max_length = clamp(Math.round(opts.targetWords * 1.6), 60, 1024); // for summarization pipeline
  const min_length = clamp(Math.round(opts.targetWords * 0.6), 30, Math.max(50, max_length - 20));

  const payload = {
    inputs: opts.input,
    parameters: {
      max_new_tokens,           // for text-gen style endpoints
      max_length,               // for summarization pipeline
      min_length,
      num_beams: 4,
      do_sample: false,
      length_penalty: 1.0,
      repetition_penalty: 1.05,
      no_repeat_ngram_size: 3,
      early_stopping: true
    },
    options: { wait_for_model: true }
  };

  // Router with explicit /models path
  const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(MODEL)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await r.text();
  if (!r.ok) {
    // HF will send messages like "index out of range in self" on too-long inputs
    throw new Error(parseHFError(raw));
  }

  return extractSummary(raw) || raw.slice(0, 1000);
}

function extractSummary(raw: string): string {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data[0]) {
      return data[0].summary_text ?? data[0].generated_text ?? "";
    }
    return (data?.summary_text || data?.generated_text || "").toString();
  } catch {
    return "";
  }
}

function parseHFError(raw: string): string {
  try { const j = JSON.parse(raw); return j?.error || raw; } catch { return raw; }
}