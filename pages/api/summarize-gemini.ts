import type { NextApiRequest, NextApiResponse } from "next";
import { getGeminiClient } from "../../lib/gemini";
import { countWords } from '../../lib/utils';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

interface SummaryResponse {
  summary: string;
  model: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, lengthPercent = 30, style = 'balanced', maxWords } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    const originalWordCount = countWords(text);
    const percentBased = Math.max(20, Math.round((originalWordCount * lengthPercent) / 100));
    const explicitMax = typeof maxWords === "number" && Number.isFinite(maxWords) && maxWords > 0 ? maxWords : null;
    const targetWordCount = explicitMax ?? percentBased;
    const client = getGeminiClient();

    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.05,
        topP: 0.8,
        topK: 40,
      },
    });

    let prompt = '';
    
    if (style === 'priority') {
      prompt = `
You are a precise text-summarization assistant with a focus on prioritizing the most important information.

Your task:
- Identify the MAIN TOPIC and CORE THEMES of the text.
- Prioritize information that directly relates to the main topic and core themes.
- You MUST produce a summary of **no more than ${targetWordCount} words**.
- First, extract all key facts and conclusions needed to preserve the original meaning.
- If including all of them would exceed ${targetWordCount} words, you MUST remove or compress lower-priority material in this order:
  * Secondary examples or minor supporting details
  * Background information that doesn't directly support the main topic
  * Repetitive or redundant information
  * Peripheral information that can be omitted without losing core meaning
- When compressing, prefer rewriting sentences to be shorter and more direct while keeping the same meaning.
- Summarize the content directly, without referring to the text itself.
- Do not use phrases like "the text", "the article", "this report", "it mentions", or "the content".
- Present the information as a direct, standalone summary.
- Break the summary into clear paragraphs when the topic or idea changes.
- Keep the writing neutral, concise, and factual.
- Keep the original language.
- No bullet points or headings.
- Do not add external information.
- If the text is chinese, try to change the sentence structure in a way that reduces the word count if possible, but remains the meaning and naturally.

Output rules:
- Break into multiple paragraphs whenever a new idea starts
- Paragraphs must be separated by a blank line.
- No introductory or concluding phrases.
- No meta commentary.

Content:
"""${text}"""
`;
    } else {
      prompt = `
You are a precise text-summarization assistant.

Your task:
- Summarize the content directly, without referring to the text itself.
- Do not use phrases like "the text", "the article", "this report", "it mentions", or "the content".
- Present the information as a direct, standalone summary.
- Break the summary into clear paragraphs when the topic or idea changes.
- Keep the writing neutral, concise, and factual.
- Keep the original language.
- No bullet points or headings.
- Do not add external information.
- Target length: approximately ${lengthPercent}% of the original text.
- IMPORTANT: If this target length is too short to cover ALL key ideas needed to preserve meaning, you MUST ignore the target and include all important points.

Output rules:
- Break into multiple paragraphs whenever a new idea starts
- Paragraphs must be separated by a blank line.
- No introductory or concluding phrases.
- No meta commentary.

Content:
"""${text}"""
`;
    }

    // First generation
    const result = await model.generateContent(prompt);
    let summary = sanitizeSummary(result.response.text());

    // === ADVANCED OPTION 3: Intelligent shortening for Priority style ===
    if (style === 'priority') {
      let currentSummary = summary;
      let attempts = 0;
      const maxAttempts = 3;

      while (countWords(currentSummary) > targetWordCount && attempts < maxAttempts) {
        attempts++;

        const shortenPrompt = `
You are a precise summarization editor. Shorten the following summary to **no more than ${targetWordCount} words** while fully preserving the core meaning, key facts, and especially the final conclusions.

Rules:
- Keep the main topic, core themes, critical facts, and all conclusions/recommendations.
- Remove or compress in this exact order:
  1. Secondary examples and minor details
  2. Non-essential background or introductory context
  3. Redundant or repetitive statements
  4. Wordy explanations that can be made concise
- If the text is chinese, try to change the sentence structure in a way that reduces the word count if possible, but remains the meaning and naturally.
- Do NOT remove or weaken final outcomes, suggestions, or key insights.
- Keep original language and paragraph structure (blank line between paragraphs).
- Output ONLY the shortened summary.

Current word count: ${countWords(currentSummary)}
Target: ≤ ${targetWordCount} words

Summary to shorten:
"""${currentSummary}"""

Shortened summary:
`;

        const shortenResult = await model.generateContent(shortenPrompt);
        const shortenedRaw = shortenResult.response.text();
        currentSummary = sanitizeSummary(shortenedRaw);
      }

      summary = currentSummary;

      // Optional: log for debugging (remove in production if desired)
      if (countWords(summary) > targetWordCount) {
        console.warn(`[NeoSummary] Priority summary still exceeds limit after ${attempts} attempts: ${countWords(summary)} > ${targetWordCount}`);
      }
    }
    // === End of intelligent shortening ===

    return res.status(200).json({
      summary,
      model: "gemini-2.5-flash-lite",
    });
  } catch (error: any) {
    console.error("Summarization error:", error);
    return res.status(500).json({ error: error.message || "Summarization failed" });
  }
}

// Helper functions
function sanitizeSummary(s: string) {
  return s
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/(?:read more|click here|visit .*)$/gi, "")
    .trim();
}