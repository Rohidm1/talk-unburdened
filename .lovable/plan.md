# Fix: customer calls never reach an agent

## What I verified

- Call rows are being created: the last ~14 attempts (13:00–14:13 today) all end within 0.4–12 seconds with status `missed` and no answer time.
- The phone provider has **zero** call records ever, and **zero** error alerts.
- The provider webhook config is correct: `https://anontalk.online/api/public/twilio/voice`, method POST.
- The published site logs show **no** request to that voice webhook at all.

Conclusion: the browser never successfully starts an audio call — it fails locally before the provider is contacted, so the agent's desk is never rung. The caller only sees the generic "De audioverbinding kon niet worden gestart" toast, which hides the real reason. Which of the three possible causes (missing voice credentials in the deployed server, a rejected access token, or a blocked microphone/connection) applies cannot be told apart from the current code, because every failure is collapsed into one message.

## Plan

1. Make the failure visible
   - Add a public health endpoint that reports only whether voice credentials are present in the live server runtime (booleans, never values), to confirm in one request whether the deployed app can mint tokens at all.
   - Verify secret binding for the published deployment and re-bind if that check shows credentials missing.

2. Report the real error instead of one generic toast
   - Distinguish and surface: voice not configured, token request failed, microphone denied/unavailable, provider connection refused (with its error code).
   - Log the provider error code and message from the device/call error handlers, and record the failure reason on the call row so failed attempts stay diagnosable instead of just being `missed`.

3. Harden the dial path
   - Wait until the call actually reaches ringing/open at the provider before showing the caller a live-looking call screen; if it never opens within a few seconds, end the attempt with a clear message.
   - Keep the existing one-time token retry, but treat "no call object returned" as a hard failure rather than a silent one.

4. Verify end to end
   - After the fix, place a test call and confirm: the voice webhook receives a POST, a call appears in the provider's call log, the agent desk shows the incoming call, and both sides have audio.

## Technical notes

- Files touched: `src/lib/voice.functions.ts` (report configured state), new `src/routes/api/public/twilio/health.ts`, `src/hooks/useTwilioDevice.ts` (typed error reasons + code logging), `src/routes/index.tsx` (error mapping, wait-for-open), `src/lib/account.functions.ts` (store failure reason on missed calls).
- No schema change beyond an optional text column for the failure reason on `calls`.