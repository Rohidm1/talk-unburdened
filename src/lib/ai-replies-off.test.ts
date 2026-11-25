import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), upsert: vi.fn(), fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const b = { middleware: () => b, inputValidator: () => b, handler: (h: unknown) => h }; return b; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const b = { select: () => b, eq: () => b, order: () => b,
      update: (v: unknown) => { mocks.update(v); return b; }, upsert: mocks.upsert,
      single: async () => ({ data: { listener_id: null } }),
      range: async () => ({ data: [{ sender_role: "client", body: "A stressful day" }] }),
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    }; return b;
  },
} }));
import { AI_REPLIES_ENABLED, requestAiReply } from "./ai-fallback.functions";
const call = requestAiReply as unknown as (input: unknown) => Promise<{ ok: boolean; reason: string | null }>;
const input = { data: { sessionId: "session", kind: "reply" }, context: { userId: "customer" } };
describe("guarded AI fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "test-only-key"); vi.stubGlobal("fetch", mocks.fetch);
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "reserve_ai_reply" ? "job" : true }));
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "That sounds heavy. What happened today?" } }] }) });
  });
  it("enables automatic fallback replies", () => { expect(AI_REPLIES_ENABLED).toBe(true); });
  it("does not generate when database human-priority or admin gates reject the turn", async () => {
    mocks.rpc.mockResolvedValue({ data: null });
    expect((await call(input)).ok).toBe(false); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("only delivers server-generated text through an atomic recheck", async () => {
    expect((await call(input)).ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("deliver_ai_reply", { _job_id: "job", _body: "That sounds heavy. What happened today?" });
  });
  it("discards the generated answer when an agent takes over before delivery", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "reserve_ai_reply" ? "job" : false }));
    expect((await call(input)).ok).toBe(false);
  });
  it("pauses automatic calls durably after service access denial without retrying", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 403 });
    expect((await call(input)).ok).toBe(false);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ key: "ai_fallback_paused" }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
