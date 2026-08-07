import { createFileRoute } from "@tanstack/react-router";

/**
 * Reports whether the voice credentials are present in the deployed server
 * runtime. Booleans only — never the values themselves.
 */
export const Route = createFileRoute("/api/public/twilio/health")({
  server: {
    handlers: {
      GET: async () => {
        const names = [
          "TWILIO_ACCOUNT_SID",
          "TWILIO_API_KEY_SID",
          "TWILIO_API_KEY_SECRET",
          "TWILIO_TWIML_APP_SID",
        ] as const;
        const present = Object.fromEntries(names.map((n) => [n, !!process.env[n]]));
        return Response.json(
          { configured: names.every((n) => !!process.env[n]), present },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});