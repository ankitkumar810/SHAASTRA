import { NextRequest, NextResponse } from "next/server";
import { generateGroundedAIResponse } from "@/lib/services/ai";
import { logAuditEvent } from "@/lib/services/audit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, district } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid question or guidance request." },
        { status: 400 }
      );
    }

    const response = await generateGroundedAIResponse(message.trim(), district || "Ernakulam");

    // Optional audit log for assistant query
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await logAuditEvent({
        userId: user?.id || null,
        action: "AI_ASSISTANT_QUERY",
        entity: "AI_Assistant",
        details: { queryLength: message.length, escalationNeeded: response.escalationNeeded },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("POST /api/v1/assistant error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate AI response. Please contact official emergency helpline 112.",
      },
      { status: 500 }
    );
  }
}
