import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function validateTwilioSignature(requestUrl: string, params: Record<string, string>, twilioSignature: string | null, authToken?: string): boolean {
  if (!authToken || !twilioSignature) return true; // In dev/unconfigured mode, bypass check

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], requestUrl);

  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return expectedSignature === twilioSignature;
}

export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = request.headers.get("X-Twilio-Signature");
    const formData = await request.formData();

    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const bodyText = (params["Body"] || "").trim().toUpperCase();
    const fromPhone = (params["From"] || "").trim();

    // Validate Signature if Auth Token is configured
    if (authToken && twilioSignature) {
      const isValid = validateTwilioSignature(request.url, params, twilioSignature, authToken);
      if (!isValid) {
        console.warn(`[SMS-WEBHOOK-UNAUTHORIZED] Rejected invalid signature from ${fromPhone.slice(0, 5)}***`);
        return new NextResponse("Unauthorized Twilio Request Signature", { status: 403 });
      }
    }

    let responseMessage = "";
    const syncTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    try {
      if (bodyText.includes("BED") || bodyText.includes("SHELTER") || bodyText.includes("STATUS")) {
        const shelters = await prisma.shelter.findMany({
          take: 2,
          where: { status: "OPEN" },
          orderBy: { availableBeds: "desc" },
          select: { name: true, locality: true, availableBeds: true, foodStockStatus: true },
        });

        if (shelters.length > 0) {
          const lines = shelters.map((s) => `• ${s.name}: ${s.availableBeds} beds (${s.locality})`);
          responseMessage = `SHAASTRA | Ernakulam (${syncTime})\n${lines.join("\n")}\nReply HELP for 112 emergency.`;
        } else {
          responseMessage = `SHAASTRA Alert (${syncTime}):\nNo open shelters with free beds reported.\nCall 112 for emergency help.`;
        }
      } else if (bodyText.includes("FOOD")) {
        const shelters = await prisma.shelter.findMany({
          take: 3,
          select: { name: true, foodStockStatus: true },
        });

        const lines = shelters.map((s) => `• ${s.name}: ${s.foodStockStatus}`);
        responseMessage = `SHAASTRA Rations (${syncTime}):\n${lines.join("\n")}\nReply HELP for 112 emergency.`;
      } else if (bodyText.includes("MED") || bodyText.includes("MEDICINE")) {
        const shelters = await prisma.shelter.findMany({
          take: 3,
          select: { name: true, medicineStockStatus: true },
        });

        const lines = shelters.map((s) => `• ${s.name}: ${s.medicineStockStatus}`);
        responseMessage = `SHAASTRA Medical Stock (${syncTime}):\n${lines.join("\n")}\nReply HELP for 112 emergency.`;
      } else if (bodyText.includes("HELP") || bodyText.includes("EMERGENCY") || bodyText.includes("RESCUE")) {
        responseMessage = `SHAASTRA EMERGENCY:\nCall 112 for immediate help.\nDistrict Control: 1077\nMove to higher ground if flooding.\nAvoid moving through fast water.`;
      } else {
        responseMessage = `SHAASTRA SMS Menu:\nReply BEDS for shelter space\nReply FOOD for ration status\nReply MEDICINE for medical stock\nReply HELP for emergency 112`;
      }
    } catch (dbError) {
      console.error("SMS Webhook DB Fallback:", dbError);
      responseMessage = `SHAASTRA Notice (Cached):\nDatabase update pending.\nCall National Emergency 112 or District Control 1077.\nConditions may have changed.`;
    }

    // Mask phone number in logs to avoid exposing PII
    const maskedPhone = fromPhone.length > 6 ? `${fromPhone.slice(0, 4)}***${fromPhone.slice(-2)}` : "***";
    console.log(`[SMS-WEBHOOK-PROCESSED] From: ${maskedPhone} | Command: ${bodyText}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`;

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("POST /api/v1/sms/webhook error:", error);
    const twimlError = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>SHAASTRA Alert: Service delay. Call 112 for immediate emergency assistance.</Message>
</Response>`;

    return new NextResponse(twimlError, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
