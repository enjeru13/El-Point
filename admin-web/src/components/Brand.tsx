/** The app/landing wordmark, ported 1:1 from components/ui/AppLogo.tsx (RN)
 *  so the admin panel reads as the same product, not a generic dashboard. */
export function Brand({ dark = false, size = "md" }: { dark?: boolean; size?: "sm" | "md" | "lg" }) {
  const scale = size === "sm" ? 0.8 : size === "lg" ? 1.5 : 1;
  const textColor = dark ? "#ffffff" : "var(--text)";
  const subColor = dark ? "rgba(255,255,255,0.62)" : "var(--text-soft)";
  const borderColor = dark ? "rgba(255,255,255,0.32)" : "var(--border)";

  return (
    <span className="inline-flex items-end gap-[3px]" style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
      <span
        className="rounded-[6px] px-[6px] py-[2px] font-display text-[13px] font-bold leading-[13px]"
        style={{ border: `1px solid ${borderColor}`, color: subColor, marginBottom: 3 }}
      >
        el
      </span>
      <span className="inline-flex items-end">
        <span className="font-display text-[26px] font-extrabold leading-[26px] tracking-[-0.5px]" style={{ color: textColor }}>
          Point
        </span>
        <span className="mb-[2px] ml-[1px] h-[7px] w-[7px] rounded-full bg-brand" style={{ border: `1px solid ${dark ? "rgba(255,255,255,0.5)" : "var(--border)"}` }} />
      </span>
    </span>
  );
}
