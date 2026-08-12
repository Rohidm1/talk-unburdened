import { useEffect, useRef, useState } from "react";

interface AdSenseSlotProps {
  client: string;
  adSlot?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const PLACEHOLDER_SLOT = "REPLACE_WITH_AD_UNIT_ID";

export function AdSenseSlot({ client, adSlot, format = "auto", className = "" }: AdSenseSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const slot = adSlot || PLACEHOLDER_SLOT;
  const isPlaceholder = slot === PLACEHOLDER_SLOT;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ref.current || isPlaceholder) return;
    const container = ref.current;
    container.innerHTML = "";

    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "100%";
    ins.setAttribute("data-ad-client", client);
    ins.setAttribute("data-ad-slot", slot);
    ins.setAttribute("data-ad-format", format);
    ins.setAttribute("data-full-width-responsive", "true");
    container.appendChild(ins);

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (err) {
      console.error("AdSense render failed:", err);
    }
  }, [mounted, client, slot, format, isPlaceholder]);

  if (isPlaceholder) {
    return (
      <div
        className={[
          "flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-4 text-center text-sm text-muted-foreground",
          className,
        ].join(" ")}
      >
        AdSense placeholder — create an ad unit in AdSense and replace the adSlot prop.
      </div>
    );
  }

  if (!mounted) {
    return (
      <div
        className={["min-h-[90px] rounded-xl border border-border bg-card/30", className].join(" ")}
        aria-label="Advertisement"
      />
    );
  }

  return (
    <div
      ref={ref}
      className={["overflow-hidden rounded-xl border border-border bg-card/30", className].join(" ")}
      aria-label="Advertisement"
    />
  );
}
