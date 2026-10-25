import { z } from "zod";

export const registrationSchema = z.object({
  email: z.string().trim().email(),
  alias: z.string().trim().min(2).max(24),
  password: z.string().min(8),
});

export function hasVerifiedEmail(user: { email_confirmed_at?: string | null; is_anonymous?: boolean } | null) {
  return Boolean(user?.email_confirmed_at && !user.is_anonymous);
}