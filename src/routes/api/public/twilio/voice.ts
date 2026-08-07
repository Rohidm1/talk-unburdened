import { createFileRoute } from "@tanstack/react-router";
import {
  conferenceNameFor,
  escapeXml,
  verifyConferenceAuth,
  verifyDialAuth,
} from "@/lib/voice.server";

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

const rejected = () => twiml("<Say>This call could not be authorised.</Say><Hangup/>");

/**
 * Every conversation is bridged through a Twilio conference instead of a direct
 * client-to-client dial. That is what makes silent supervision possible: an
 * admin can join the same room muted, without changing anything for the two
 * people talking.
 */
function conference(name: string, attrs: string) {
  return (
    `<Dial><Conference beep="false" waitUrl="" ${attrs}>` +
    `${escapeXml(name)}</Conference></Dial>`
  );
}

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const mode = String(form.get("Mode") ?? "customer");
        const caller = String(form.get("CallerIdentity") ?? "");
        const target = String(form.get("TargetIdentity") ?? "");
        const dialAuth = String(form.get("DialAuth") ?? "");
        const callId = String(form.get("CallRecordId") ?? "");
        const identity = String(form.get("Identity") ?? "");
        const confAuth = String(form.get("ConferenceAuth") ?? "");

        // Agent joining the room after accepting, or admin listening in silently.
        if (mode === "agent" || mode === "monitor") {
          if (!callId || !identity || !confAuth) return rejected();
          const name = conferenceNameFor(callId);
          const ok = await verifyConferenceAuth(identity, name, mode, confAuth);
          if (!ok) return rejected();

          return twiml(
            mode === "agent"
              ? conference(name, 'startConferenceOnEnter="true" endConferenceOnExit="true"')
              : conference(
                  name,
                  'muted="true" startConferenceOnEnter="false" endConferenceOnExit="false"',
                ),
          );
        }

        // Customer placing the call: enters the room and waits in silence until
        // the agent accepts and joins.
        if (!caller || !target || !dialAuth || !callId) return rejected();
        if (!(await verifyDialAuth(caller, target, dialAuth))) return rejected();

        return twiml(
          conference(
            conferenceNameFor(callId),
            'startConferenceOnEnter="false" endConferenceOnExit="true"',
          ),
        );
      },
    },
  },
});