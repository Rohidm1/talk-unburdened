import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/crm")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/crm-login" });

    const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: data.user.id, _role: "staff" }),
    ]);
    if (!isAdmin && !isStaff) throw redirect({ to: "/crm-login" });

    return { user: data.user, isAdmin: Boolean(isAdmin) };
  },
  component: () => <Outlet />,
});
