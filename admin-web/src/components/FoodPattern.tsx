import { ChefHat, Coffee, IceCreamCone, Pizza, Soup, UtensilsCrossed } from "lucide-react";

const ICONS = [
  { Icon: Pizza, top: "8%", left: "6%", size: 70, rotate: -14 },
  { Icon: Coffee, top: "62%", left: "3%", size: 56, rotate: 10 },
  { Icon: UtensilsCrossed, top: "14%", left: "84%", size: 64, rotate: 18 },
  { Icon: Soup, top: "72%", left: "86%", size: 58, rotate: -8 },
  { Icon: IceCreamCone, top: "40%", left: "92%", size: 46, rotate: -20 },
  { Icon: ChefHat, top: "84%", left: "44%", size: 50, rotate: 6 },
];

/** Same idea as the Play Store feature graphic: faint rotated line-icons of
 *  food, scattered — a brand detail unique to a food app, not a generic
 *  gradient blob. Purely decorative, sits behind real content. */
export function FoodPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {ICONS.map(({ Icon, top, left, size, rotate }, i) => (
        <Icon
          key={i}
          size={size}
          strokeWidth={1.25}
          className="absolute text-brand opacity-[0.08]"
          style={{ top, left, transform: `rotate(${rotate}deg)` }}
        />
      ))}
    </div>
  );
}
