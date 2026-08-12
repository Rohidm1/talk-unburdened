import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error("Could not send your message. Please try again.");
    return { ok: true as const };
  });
