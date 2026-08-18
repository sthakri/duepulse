import { TablesInsert } from "@/database.types";

type CanvasAssignment = Omit<TablesInsert<"assignments">, "user_id" | "course_id"> & {
  canvas_course_id: number;
};

export type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
};

// ponytail: one subclass beats a string sniff. 401 is the only auth signal
// Canvas returns; everything else stays a generic Error.
export class CanvasAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasAuthError";
  }
}

const ALLOWED_CANVAS_DOMAINS = /^(?:(?:[a-zA-Z0-9-]+\.)+(?:instructure\.com|instructure\.io)|[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})$/;

function isPrivateIP(hostname: string): boolean {
  return /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|0\.|127\.|169\.254\.|fc|fe80)/i.test(hostname);
}

function validateCanvasDomain(domain: string): void {
  const hostname = domain.replace(/:\d+$/, "").toLowerCase();
  if (isPrivateIP(hostname)) {
    throw new Error(`Blocked private/internal domain: "${domain}".`);
  }
  if (!ALLOWED_CANVAS_DOMAINS.test(hostname)) {
    throw new Error(
      `Blocked disallowed Canvas domain: "${domain}". Only *.instructure.com, *.instructure.io, or standard school domains are permitted.`
    );
  }
}

async function fetchAllPages<T>(
  token: string,
  domain: string,
  url: string
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl = url;
  let pageCount = 0;
  const MAX_PAGES = 50;

  while (nextUrl && pageCount < MAX_PAGES) {
    pageCount++;
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new CanvasAuthError(`Canvas returned 401 — token expired or revoked`);
      }
      throw new Error(`Canvas API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: T[] = await response.json();
    all.push(...data);

    const linkHeader = response.headers.get("Link");
    nextUrl = "";
    if (linkHeader) {
      const links = linkHeader.split(", ");
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          nextUrl = match[1];
          break;
        }
      }
    }
  }

  return all;
}

export async function getCanvasCourses(
  token: string,
  domain: string
): Promise<CanvasCourse[]> {
  validateCanvasDomain(domain);

  const url = `https://${domain}/api/v1/courses?per_page=100&enrollment_state=active&enrollment_type=student&include[]=term`;
  const courses = await fetchAllPages<CanvasCourse>(token, domain, url);

  return courses.filter((c) => c.name && c.name.trim() !== "");
}

export async function getCanvasAssignments(
  token: string,
  domain: string
): Promise<CanvasAssignment[]> {
  validateCanvasDomain(domain);

  const today = new Date();
  const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    per_page: "100",
    start_date: today.toISOString(),
    end_date: endDate.toISOString(),
  });

  const assignmentsUrl = `https://${domain}/api/v1/planner/items?${params}`;
  const items = await fetchAllPages<unknown>(token, domain, assignmentsUrl);

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        (item as Record<string, unknown>).plannable_type === "assignment"
    )
    .map((item) => {
      const plannable = item.plannable as Record<string, unknown> | undefined;
      const submissions = item.submissions as Record<string, unknown> | undefined;
      return {
        canvas_assignment_id: Number(item.plannable_id),
        canvas_course_id: Number(item.course_id),
        title: String(plannable?.title ?? ""),
        due_at: typeof plannable?.due_at === "string"
          ? plannable.due_at
          : typeof item.plannable_date === "string"
          ? item.plannable_date
          : null,
        points_possible:
          plannable?.points_possible != null
            ? Number(plannable.points_possible)
            : null,
        html_url: typeof item.html_url === "string" ? item.html_url : null,
        submission_types: Array.isArray(plannable?.submission_types)
          ? (plannable.submission_types as string[])
          : [],
        is_completed: submissions?.submitted === true,
        priority: 3,
      };
    });
}

export async function testCanvasConnection(
  token: string,
  domain: string
): Promise<{ success: boolean; courseCount: number; error?: string }> {
  try {
    validateCanvasDomain(domain);

    const response = await fetch(
      `https://${domain}/api/v1/courses?per_page=50&enrollment_state=active&enrollment_type=student`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      return { success: false, courseCount: 0, error: `HTTP ${response.status}` };
    }

    const courses: unknown[] = await response.json();
    return { success: true, courseCount: courses.length };
  } catch (err) {
    return {
      success: false,
      courseCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
