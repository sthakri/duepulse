import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchAllPages } from "@/lib/canvas";

const HOST = "https://school.instructure.com";

function page(body: unknown[], link?: string): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: link ? { Link: link } : undefined,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchAllPages", () => {
  // Regression: any response with a Link header used to throw
  // TypeError "Invalid URL" (host was read from nextUrl AFTER clearing it),
  // which killed every sync at the API layer with toast "Invalid URL".
  it("follows a same-host next link and accumulates all pages", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1 }], `<${HOST}/api/v1/x?page=2>; rel="next"`))
      .mockResolvedValueOnce(page([{ id: 2 }], `<${HOST}/api/v1/x?page=1>; rel="first"`));
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchAllPages<{ id: number }>("tok", "school.instructure.com", `${HOST}/api/v1/x`);

    expect(items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${HOST}/api/v1/x?page=2`);
  });

  it("stops paging when the next link points at a different host (token safety)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([{ id: 1 }], `<https://evil.example.com/api/v1/x?page=2>; rel="next"`));
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchAllPages<{ id: number }>("tok", "school.instructure.com", `${HOST}/api/v1/x`);

    expect(items).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a single page without a Link header", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(page([{ id: 1 }]));
    vi.stubGlobal("fetch", fetchMock);

    const items = await fetchAllPages<{ id: number }>("tok", "school.instructure.com", `${HOST}/api/v1/x`);

    expect(items).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
