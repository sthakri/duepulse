import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/OnboardingWizard";

export const metadata = { title: "Get Started — DuePulse" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <div className="min-h-screen bg-[#0C111B] flex items-center justify-center p-4">
      <OnboardingWizard userEmail={user.email ?? undefined} />
    </div>
  );
}
