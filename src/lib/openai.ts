import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export async function generateNudge(
  assignmentTitle: string,
  dueDate: string,
  courseName: string
): Promise<string> {
  const due = new Date(dueDate)
  const now = new Date()
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueMidnight.getTime() - nowMidnight.getTime()) / 86_400_000)
  const relativeDay = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`
  const exactTime = due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const dueDateReadable = `${relativeDay} at ${exactTime}`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `You are a funny, warm study buddy texting a student a push notification.
  Assignment: "${assignmentTitle}" for ${courseName}, due ${dueDateReadable}.
  Write ONE push notification under 120 characters.
  Rules:
  - ALWAYS name the specific assignment (shorten if needed)
  - ALWAYS say when it's due (e.g. "tonight", "tomorrow at 11 PM", "in 2 days")
  - Sound like a real friend — a little playful, never robotic
  - Light urgency, never alarming
  - Example: "Psst! Calc HW 7 is due tonight at 11 PM — don't sleep on it 😅"
  - Example: "hey ur CS Final is due tomorrow — maybe open it? 👀"
  Return only the notification text, nothing else.`,
  });
  return text.trim();
}
