import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateNudge(
  assignmentTitle: string,
  dueDate: string,
  courseName: string
): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Write a single push notification message under 100 characters reminding a student about "${assignmentTitle}" for ${courseName} due ${dueDate}. Return only the message, no quotes.`,
  });
  return text.trim();
}
