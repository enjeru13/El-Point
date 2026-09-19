/** The app/landing wordmark, ported 1:1 from components/ui/AppLogo.tsx (RN)
 *  so the admin panel reads as the same product, not a generic dashboard. */
const PIN_RATIO = 689 / 557;

/** `align="center"`: escala desde el centro, para logos centrados (login, barra móvil). */
export function Brand({
  dark = false,
  size = "md",
  align = "left",
}: {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
}) {
  const scale = size === "sm" ? 0.8 : size === "lg" ? 1.5 : 1;
  const textColor = dark ? "#ffffff" : "var(--text)";
  const subColor = dark ? "rgba(255,255,255,0.62)" : "var(--text-soft)";
  const borderColor = dark ? "rgba(255,255,255,0.32)" : "var(--border)";
  const pinH = 24;
  const pinW = Math.round(pinH / PIN_RATIO);

  return (
    <span className="inline-flex items-center gap-[6px]" style={{ transform: `scale(${scale})`, transformOrigin: align === "center" ? "center" : "left center" }}>
      <span
        className="rounded-[6px] px-[6px] py-[2px] font-display text-[13px] font-bold leading-[13px]"
        style={{ border: `1px solid ${borderColor}`, color: subColor }}
      >
        el
      </span>
      <span className="font-display text-[26px] font-extrabold leading-[26px] tracking-[-0.5px]" style={{ color: textColor }}>
        Point
      </span>
      <img
        src={dark ? "/assets/logo-pin-dark.png" : "/assets/logo-pin.png"}
        alt=""
        width={pinW}
        height={pinH}
        style={{ marginBottom: -1 }}
      />
    </span>
  );
}
