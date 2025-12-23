import type { NextApiRequest, NextApiResponse } from "next";
import { getGeminiClient } from "../../lib/gemini";

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, maxBullets = 12, targetLang } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });

  const cleaned = text.replace(/\s+\n/g, "\n").trim();
  let bullets: string[] = [];

  const hasKey = !!process.env.GOOGLE_GEMINI_API_KEY;
  if (hasKey) {
    try {
      const targetLabel =
        targetLang === "zh" ? "Chinese" :
        targetLang === "ms" ? "Malay (Bahasa Melayu)" :
        targetLang === "en" ? "English" :
        null;

      const languageRule = targetLabel
        ? `Write the bullet text in ${targetLabel}.`
        : `Write the bullet text in the same language as the input.`;

      const prompt = `
Transform the user's text into concise, informative bullet points for study notes.

Rules:
- Keep each bullet 1–2 short sentences max.
- Preserve important details, terms, and cause→effect relationships.
- ${languageRule}
- No intro/outro text. Return STRICT JSON only:

{"bullets":["point 1","point 2", "..."]}

Aim for up to ${maxBullets} bullets based on content density.

TEXT:
"""${cleaned}"""`;

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const resp = await model.generateContent(prompt);
      const raw = resp.response.text().trim();

      // Parse strict or fenced JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed?.bullets)) {
        bullets = parsed.bullets
          .map((b: any) => (typeof b === "string" ? b.trim().replace(/^[•\-*\d.)\s]+/, "") : ""))
          .filter(Boolean);
      }
    } catch (e) {
      // fall through to local fallback
      // console.error("Bullets API Gemini error:", e);
    }
  }

  if (!bullets.length) bullets = fallbackBullets(cleaned, maxBullets);

  return res.status(200).json({ bullets });
}

function fallbackBullets(text: string, maxBullets: number): string[] {
  // Split on newlines and sentence boundaries, keep meaningful bits
  const chunks = text
    .split(/\n{2,}/) // paragraphs first
    .flatMap(p =>
      p.split(/(?<=[.!?])\s+(?=[A-Z(])/).map(s => s.trim())
    )
    .map(s => s.replace(/^[•\-*\d.)\s]+/, "").trim())
    .filter(s => s.split(/\s+/).length >= 4 && s.length <= 280);

  // Score heuristically
  const scored = chunks.map(s => {
    const kw = (s.match(/\b(key|important|critical|must|should|objective|goal|risk|issue|benefit|result|therefore|consequently|definition|process|step|ensure|defect|testing|quality|QA|inspection)\b/gi) || []).length;
    const nums = (s.match(/\d+/g) || []).length;
    const colon = /:/.test(s) ? 1 : 0;
    const lenScore = Math.min(Math.max(s.length - 40, 0) / 10, 10);
    return { s, score: kw * 6 + nums * 2 + colon * 2 + lenScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const limit = Math.min(maxBullets, Math.max(5, Math.floor(chunks.length / 6)));
  const unique: string[] = [];
  for (const { s } of scored) {
    if (!unique.some(u => u.toLowerCase() === s.toLowerCase())) unique.push(s);
    if (unique.length >= limit) break;
  }
  return unique;
}