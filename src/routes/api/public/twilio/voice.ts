import { createFileRoute } from "@tanstack/react-router";
import { escapeXml, verifyDialAuth } from "@/lib/voice.server";

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const caller = String(form.get("CallerIdentity") ?? "");
        const target = String(form.get("TargetIdentity") ?? "");
        const dialAuth = String(form.get("DialAuth") ?? "");

        if (!caller || !target || !dialAuth || !(await verifyDialAuth(caller, target, dialAuth))) {
          return twiml("<Say>This call could not be authorised.</Say><Hangup/>");
        }

        return twiml(
          `<Dial answerOnBridge="true" timeout="30" callerId="${escapeXml(caller)}">` +
            `<Client><Identity>${escapeXml(target)}</Identity></Client></Dial>`,
        );
      },
    },
  },
});