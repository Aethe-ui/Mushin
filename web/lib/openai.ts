import OpenAI from "openai";

export const MUSHIN_SYSTEM_PROMPT = `You are a silent productivity assistant. The user is in a deep focus session.
Your job: provide ONE short, actionable suggestion (max 2 sentences).
Do not greet. Do not explain yourself. Do not ask questions.
Be direct, specific, and immediately useful.`;

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: key });
}
