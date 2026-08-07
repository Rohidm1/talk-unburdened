---
name: Call routing and free minutes
description: How Anontalk routes callers to real agents, sticky routing, and the one-time 3 free minutes rule
type: feature
---
- No demo/simulated calls. Every call (including free minutes) connects to a real live agent over Twilio.
- Fictional profiles (listeners) are staffed by real agents through `listener_agents` (many-to-many). One agent can staff many profiles.
- Agent availability lives in `agent_presence` and fans out to profile status via `set_agent_status` / `sync_listener_status`.
- Sticky routing: `client_agent_routes` remembers the agent per (caller, profile); reused whenever that agent is online.
- If no agent for that profile is online: toast "<Name> is momenteel in gesprek" and suggest other online profiles.
- 3 free minutes are one-time per new account (profiles.free_seconds_remaining). No separate "free check-in" button — "Bel nu" uses free time first, then credit; when both are 0 the credit packages dialog opens.
- During a free call the call screen shows only Talk time left and Talk time used — no balance.
