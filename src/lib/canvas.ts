import { TablesInsert } from "@/database.types";

type CanvasAssignment = Omit<TablesInsert<"assignments">, "user_id" | "course_id"> & {
  canvas_course_id: number;
};

export async function getCanvasAssignments(
  token: string,
  domain: string
): Promise<CanvasAssignment[]> {
  try {
    const today = new Date();
    const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      per_page: "50",
      start_date: today.toISOString(),
      end_date: endDate.toISOString(),
    });

    const response = await fetch(
      `https://${domain}/api/v1/planner/items?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return [];

    const items: unknown[] = await response.json();

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
          due_at: typeof item.plannable_date === "string" ? item.plannable_date : null,
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
  } catch {
    return [];
  }
}

export async function testCanvasConnection(
  token: string,
  domain: string
): Promise<{ success: boolean; courseCount: number; error?: string }> {
  try {
    const response = await fetch(
      `https://${domain}/api/v1/courses?per_page=1`,
      { headers: { Authorization: `Bearer ${token}` } }
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
