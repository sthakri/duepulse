import { NextRequest, NextResponse } from "next/server";
import { testCanvasConnection } from "@/lib/canvas";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).token !== "string" ||
    typeof (body as Record<string, unknown>).domain !== "string" ||
    !(body as Record<string, unknown>).token ||
    !(body as Record<string, unknown>).domain
  ) {
    return NextResponse.json(
      { error: "Missing token or domain" },
      { status: 400 }
    );
  }
  const { token, domain } = body as { token: string; domain: string };
  console.log("Canvas test - domain:", domain, "token length:", token.length);
  const result = await testCanvasConnection(token, domain);
  return NextResponse.json(result);
}
