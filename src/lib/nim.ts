import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const nim = createOpenAI({
  apiKey: env.NIM_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function generateNudge(
  assignmentTitle: string,
  dueDate: string,
  courseName: string,
  userTz: string = "America/Chicago",
): Promise<string> {
  const due = new Date(dueDate);
  const now = new Date();
  const msUntilDue = due.getTime() - now.getTime();

  // Use exact time difference — not calendar-day diff — for the relative label.
  const relativeDay =
    msUntilDue < 0
      ? "past due"
      : msUntilDue <= 24 * 60 * 60 * 1000
        ? "today"
        : msUntilDue <= 48 * 60 * 60 * 1000
          ? "tomorrow"
          : `in ${Math.round(msUntilDue / 86_400_000)} days`;

  // Format the exact due time in the user's local timezone.
  const exactTime = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    minute: "2-digit",
  }).format(due);

  const dueDateReadable = `${relativeDay} at ${exactTime}`;

  const { text } = await generateText({
    model: nim.chat("mistralai/mistral-large-3-675b-instruct-2512"),
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
