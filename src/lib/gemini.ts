// src/lib/gemini.ts

import { WeeklyPlan } from "./planEngine";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Best-effort AI refinement.
 * If anything fails, the original plan is returned unchanged.
 */
export async function refinePlanWithAI(
  plan: WeeklyPlan
): Promise<WeeklyPlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  // AI is optional — silently skip if unavailable
  if (!apiKey) {
    return plan;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
You are a supportive health assistant.

Explain the following weekly diabetes plan in an empathetic, motivating tone.
Do NOT give medical advice beyond what is stated.
Do NOT introduce new actions.
Keep the response under 150 words.

Plan focus:
${plan.focus}

Plan details:
${JSON.stringify(plan.dayPlans, null, 2)}

Metrics summary:
${JSON.stringify(plan.metrics, null, 2)}
`;

    const result = await model.generateContent(prompt);
    const text = result?.response?.text();

    if (!text || text.length < 20) {
      return plan;
    }

    return {
      ...plan,
      source: "rule-engine+ai",
      aiSummary: text.trim(),
    };
  } catch (error) {
    // AI failure must NEVER affect core functionality
    return plan;
  }
}
