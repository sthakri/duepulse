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

  // Use the same calendar-day diff as AssignmentCard so both agree on "today" vs "tomorrow".
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: userTz });
  const todayStr = fmt.format(now);
  const dueStr = fmt.format(due);
  const diffDays = Math.round(
    (new Date(`${dueStr}T00:00:00Z`).getTime() -
      new Date(`${todayStr}T00:00:00Z`).getTime()) /
      86_400_000,
  );

  const relativeDay =
    diffDays <= 0
      ? "today"
      : diffDays === 1
        ? "tomorrow"
        : `in ${diffDays} days`;

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
