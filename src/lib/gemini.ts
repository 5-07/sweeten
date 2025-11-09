// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
if (!apiKey) throw new Error("Gemini API key missing. Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local");

export const genAI = new GoogleGenerativeAI(apiKey);

export async function generatePlanFromVitals(vitals: Record<string, any>) {
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  Generate a detailed, personalized weekly diabetes management plan based on the following data:
  ${JSON.stringify(vitals, null, 2)}
  Include practical dietary, insulin, and exercise suggestions.
  Keep it under 200 words.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
