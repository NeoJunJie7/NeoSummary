import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

const ga = new GoogleGenAI({ apiKey: process.env.GENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, target } = req.body || {};
  if (!text || !target) return res.status(400).json({ error: "Missing text or target" });

  const targetLabel =
    target === "zh" ? "Chinese" :
    target === "ms" ? "Malay (Bahasa Melayu)" :
    target === "en" ? "English" :
    "English";
  
  // Prompt enforces output strictly in the target language
  const prompt = `You are a professional translator.
Translate the text below into ${targetLabel} ONLY.
- Preserve meaning and tone precisely.
- Translate place names and proper nouns into natural ${targetLabel} where a common localized form exists (e.g., "Great Barrier Reef" -> "Terumbu Karang Besar").
- Keep paragraph breaks; use double newlines (\\n\\n) between paragraphs.
- Do NOT add explanations, prefaces, or the original language.
- Respond solely in ${targetLabel}.

Text to translate:
${text}`;

  try {
    const result: any = await ga.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const translated = result?.text ?? result?.output_text ?? JSON.stringify(result);
    // Use .trim() to clean up leading/trailing whitespace/newlines
    const final = (translated || "").trim().normalize?.("NFC") ?? translated; 
    res.status(200).json({ translated: final });
  } catch (err: any) {
    console.error("translate error:", err);
    res.status(500).json({ error: String(err?.message ?? err) });
  }
}