import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getAiFallbackSettings, setAiFallbackSettings } from "@/lib/portal.functions";
import { en } from "@/locales/en";

export function AiFallbackControl() {
  const queryClient = useQueryClient();
  const get = useServerFn(getAiFallbackSettings);
  const save = useServerFn(setAiFallbackSettings);
  const setting = useQuery({ queryKey: ["ai-fallback-setting"], queryFn: () => get(), refetchInterval: 10000 });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => save({ data: { enabled } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["ai-fallback-setting"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
      <label htmlFor="ai-fallback-switch" className="text-sm font-medium">{en.chat.aiControl}</label>
      <Switch id="ai-fallback-switch" checked={setting.data?.enabled ?? false} disabled={!setting.data || mutation.isPending} onCheckedChange={(value) => mutation.mutate(value)} />
      <span className="text-xs text-muted-foreground">{setting.isError ? en.chat.aiSettingsError : setting.data?.paused ? en.chat.aiPaused : setting.data?.enabled ? en.chat.aiEnabled : en.chat.aiDisabled}</span>
      {setting.data?.paused ? <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>{en.chat.aiResume}</Button> : null}
    </section>
  );
}