import { createClient } from "@/lib/supabase/server";
import { syncUserProfile, getDashboardPathForRole } from "@/lib/services/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/citizen";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const profile = await syncUserProfile({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "SHAASTRA User",
        requestedRole: data.user.user_metadata?.requested_role,
        districtId: data.user.user_metadata?.district_id,
      });

      const redirectPath = profile ? getDashboardPathForRole(profile.role) : next;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could%20not%20authenticate`);
}
