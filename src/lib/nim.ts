import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const nim = createOpenAI({
  apiKey: env.NIM_API_KEY,
  baseURL: env.NIM_BASE_URL,
});

const FALLBACK_PRODUCTIVE_NUDGES = [
  "Peak brainpower detected 🧠⚡ 25 mins of focus now = 100% guilt-free chilling tonight. Let's get it!",
  "Your focus superpower is live right now 🔥 Knock out a task or two while you're in the zone!",
  "Future you called from the weekend: 'Please do 20 mins of work now, I want to sleep in' 😴✨",
  "Lock in mode: ACTIVATED 🚀 Time to make those assignments look light work!",
  "Coffee poured, brain in flow state ☕💪 Knock out a quick task and feel like a legend today.",
  "Prime focus window unlocked 🧠 Time to cook and get ahead of the week!",
];

export interface ProductiveNudgeContext {
  upcomingAssignments?: Array<{ title: string; courseName?: string; dueAt?: string | null }>;
  totalPendingCount?: number;
  userTz?: string;
}

export async function generateProductiveWindowNudge({
  upcomingAssignments = [],
  totalPendingCount = 0,
  userTz = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: ProductiveNudgeContext = {}): Promise<string> {
  const fallback =
    FALLBACK_PRODUCTIVE_NUDGES[Math.floor(Math.random() * FALLBACK_PRODUCTIVE_NUDGES.length)];

  const assignmentSummaries = upcomingAssignments
    .slice(0, 3)
    .map((a) => (a.courseName ? `"${a.title}" (${a.courseName})` : `"${a.title}"`))
    .join(", ");

  const prompt = `You are a funny, witty, ultra-motivating study buddy texting a student a push notification during their prime productive window.

Context:
- The student is in their peak focus / study time right now!
- Upcoming assignments on deck (${totalPendingCount || upcomingAssignments.length} total): ${assignmentSummaries || "A couple tasks lined up"}
- User timezone: ${userTz}

Goal:
Write ONE short push notification (under 115 characters).
Tone & Rules:
- MUST BE FUNNY, WITTY, AND MOTIVATING.
- DO NOT just act like a boring alarm clock or countdown timer for a single assignment.
- Instead, give them high-energy motivation, a funny study truth, a clever psychological trick, or lock-in hype to get them to open their work.
- Sound like a real funny friend, never corporate or robotic.
- Include 1-2 energetic emojis (e.g. 🧠⚡, 🔥, 🚀, ☕, 😴, 🏆).
- Examples:
  * "Peak brainpower detected 🧠⚡ 25 mins of focus now = guilt-free chilling tonight. Let's get it!"
  * "Your focus superpower is live right now 🔥 Knock out a task or two while you're in the zone!"
  * "Future you called from Saturday: 'Please do 20 mins now so I can nap peacefully' 😴✨"
  * "Lock in mode: ACTIVATED 🚀 Knock out a quick task and feel like a genius today."
  * "Coffee? Check. 200 IQ focus? Check. Let's make today light work ☕💪"

Return ONLY the push notification text, nothing else.`;

  try {
    const { text } = await generateText({
      model: nim.chat(env.NIM_MODEL),
      prompt,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return text.trim() || fallback;
  } catch (err) {
    console.error("NIM generateProductiveWindowNudge error:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function generateNudge(
  assignmentTitle: string,
  dueDate: string,
  courseName: string,
  userTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<string> {
  const due = new Date(dueDate);
  const now = new Date();

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

  const exactTime = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    minute: "2-digit",
  }).format(due);

  const dueDateReadable = `${relativeDay} at ${exactTime}`;

  try {
    const { text } = await generateText({
      model: nim.chat(env.NIM_MODEL),
      prompt: `You are a funny, warm study buddy texting a student a push notification.
Assignment: "${assignmentTitle}" for ${courseName}, due ${dueDateReadable}.
Write ONE push notification under 120 characters.
Rules:
- Shorten assignment title if needed
- Say when it's due (e.g. "tonight", "tomorrow at 11 PM", "in 2 days")
- Sound like a real friend — playful, humorous, never robotic
- Light urgency, uplifting motivation
- Example: "Psst! Calc HW 7 is due tonight at 11 PM — knock it out and chill guilt-free 😅"
- Example: "hey ur CS Final is due tomorrow — future you will thank you for starting now 👀🚀"
Return only the notification text, nothing else.`,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return text.trim() || `${assignmentTitle} is due ${dueDateReadable}!`;
  } catch (err) {
    console.error("NIM generateNudge error:", err instanceof Error ? err.message : err);
    return `${assignmentTitle} is due ${dueDateReadable}!`;
  }
}
