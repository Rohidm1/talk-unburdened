import { beforeEach, describe, expect, it, vi } from "vitest";
import { CREDIT_PACKAGES } from "@/lib/credit-packages";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  createPortal: vi.fn(),
  listPrices: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_blocked: false } }) }) }),
    }),
  },
}));
vi.mock("@/lib/stripe.server", () => ({
  createStripeClient: () => ({
    prices: { list: mocks.listPrices },
    products: { retrieve: async () => ({ name: "Starter credits" }) },
    customers: { search: async () => ({ data: [{ id: "cus_review" }] }) },
    checkout: { sessions: { create: mocks.createSession } },
    billingPortal: { sessions: { create: mocks.createPortal } },
  }),
  getStripeErrorMessage: (error: unknown) => String(error),
}));

import { createCreditCheckout, createPortalSession } from "./payments.functions";

const context = {
  userId: "review-user",
  supabase: { auth: { getUser: async () => ({ data: { user: { email: "review@example.com" } } }) } },
};
// In these tests the server-function builder exposes its handler directly.
const checkoutHandler = createCreditCheckout as unknown as (input: unknown) => Promise<unknown>;
const portalHandler = createPortalSession as unknown as (input: unknown) => Promise<unknown>;

describe("payment session completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPrices.mockResolvedValue({ data: [{ id: "price_starter", product: "prod_starter", unit_amount: CREDIT_PACKAGES.starter.cents, currency: "usd" }] });
    mocks.createSession.mockResolvedValue({ id: "cs_review", client_secret: "test_client_secret" });
    mocks.createPortal.mockResolvedValue({ url: "https://billing.stripe.com/review" });
  });

  it("creates inline checkout without the forbidden return URL", async () => {
    const result = await checkoutHandler({ data: { packageKey: "starter", environment: "sandbox", returnUrl: "https://anontalk.online/account" }, context });
    expect(result).toEqual({ clientSecret: "test_client_secret", sessionId: "cs_review" });
    const payload = mocks.createSession.mock.calls[0]?.[0];
    expect(payload).toMatchObject({ ui_mode: "embedded_page", redirect_on_completion: "never", customer: "cus_review" });
    expect(payload).not.toHaveProperty("return_url");
  });

  it("preserves the safe account return URL for the billing portal", async () => {
    await portalHandler({ data: { environment: "sandbox", returnUrl: "https://untrusted.example/redirect" }, context });
    expect(mocks.createPortal).toHaveBeenCalledWith({ customer: "cus_review", return_url: "https://anontalk.online/account" });
  });
});