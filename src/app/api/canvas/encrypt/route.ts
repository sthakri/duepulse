import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";

const encryptBodySchema = z.object({
  plaintext: z.string().min(1).max(1024),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await req.json();
  const result = encryptBodySchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 422 });
  }

  const ciphertext = await encrypt(result.data.plaintext);
  return NextResponse.json({ ciphertext });
}
