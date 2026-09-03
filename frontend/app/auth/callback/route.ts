import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const user = data.user;
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";

      // Ensure profile is always created safely
      await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          full_name: fullName,
          email: user.email || "",
        },
        { onConflict: "user_id" }
      );
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
