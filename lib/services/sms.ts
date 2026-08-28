export interface SMSResult {
  sent: boolean;
  messageId?: string;
  provider: string;
  mode: "PRODUCTION" | "DEVELOPMENT_MOCK";
  details: string;
}

export async function sendSMS(
  to: string,
  message: string,
  priority: "EMERGENCY" | "NORMAL" = "NORMAL"
): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!to || !message) {
    return {
      sent: false,
      provider: accountSid ? "TWILIO" : "MOCK",
      mode: "DEVELOPMENT_MOCK",
      details: "Missing recipient phone number or message content.",
    };
  }

  // If Twilio credentials are configured in environment
  if (accountSid && authToken && fromNumber) {
    try {
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", fromNumber);
      params.append("Body", message);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        console.log(`[SMS-PRODUCTION] Sent via Twilio SID ${data.sid} to ${to} (Priority: ${priority})`);
        return {
          sent: true,
          messageId: data.sid,
          provider: "TWILIO",
          mode: "PRODUCTION",
          details: `Dispatched via Twilio API (SID: ${data.sid}).`,
        };
      } else {
        console.error("Twilio API error response:", data);
        return {
          sent: false,
          provider: "TWILIO",
          mode: "PRODUCTION",
          details: `Twilio API error: ${data.message || data.detail || response.statusText}`,
        };
      }
    } catch (error) {
      console.error("Twilio SMS dispatch exception:", error);
      return {
        sent: false,
        provider: "TWILIO",
        mode: "PRODUCTION",
        details: `Twilio dispatch error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // Safe Development / Mock Adapter (Does NOT pretend an SMS was delivered)
  console.log(`[SMS-MOCK-DEV] Destination: ${to} | Priority: ${priority} | Message: "${message}"`);
  return {
    sent: false,
    provider: "MOCK",
    mode: "DEVELOPMENT_MOCK",
    details: "No live Twilio credentials configured. Message logged to server console boundary.",
  };
}
