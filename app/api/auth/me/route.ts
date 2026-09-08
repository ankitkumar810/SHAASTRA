import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user profile" }, { status: 500 });
  }
}
