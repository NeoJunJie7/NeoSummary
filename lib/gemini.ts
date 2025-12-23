import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("Missing GOOGLE_GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
}