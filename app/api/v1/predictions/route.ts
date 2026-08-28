import { NextRequest, NextResponse } from "next/server";
import { evaluateShelterPredictions } from "@/lib/services/prediction";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile || profile.role === "CITIZEN") {
      return NextResponse.json({ success: false, error: "Forbidden: Operational predictions are restricted to authorities and shelter managers." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get("districtId") || undefined;
    const riskFilter = searchParams.get("riskLevel") || undefined;

    const summary = await evaluateShelterPredictions(districtId);

    if (riskFilter && riskFilter !== "ALL") {
      summary.highestRiskItems = summary.highestRiskItems.filter((item) => item.riskLevel === riskFilter);
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("GET /api/v1/predictions error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate resource predictions" }, { status: 500 });
  }
}
