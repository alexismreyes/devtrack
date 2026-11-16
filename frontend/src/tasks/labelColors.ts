import type { LabelColor } from "../api/types";

export const LABEL_COLORS: readonly LabelColor[] = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "TEAL",
  "BLUE",
  "PURPLE",
  "PINK",
  "GRAY",
] as const;

const LABEL_CHIP_CLASSES: Record<LabelColor, string> = {
  RED: "bg-red-600/85 text-white",
  ORANGE: "bg-orange-500/90 text-white",
  YELLOW: "bg-yellow-400/90 text-yellow-950",
  GREEN: "bg-green-600/85 text-white",
  TEAL: "bg-teal-600/85 text-white",
  BLUE: "bg-blue-600/85 text-white",
  PURPLE: "bg-violet-600/85 text-white",
  PINK: "bg-pink-500/90 text-white",
  GRAY: "bg-zinc-500/85 text-white",
};

/** Soft status-color tint for Kanban column header strips (readable foreground). */
const LABEL_SOFT_TINT_CLASSES: Record<LabelColor, string> = {
  RED: "bg-red-600/15 text-foreground",
  ORANGE: "bg-orange-500/15 text-foreground",
  YELLOW: "bg-yellow-400/20 text-foreground",
  GREEN: "bg-green-600/15 text-foreground",
  TEAL: "bg-teal-600/15 text-foreground",
  BLUE: "bg-blue-600/15 text-foreground",
  PURPLE: "bg-violet-600/15 text-foreground",
  PINK: "bg-pink-500/15 text-foreground",
  GRAY: "bg-zinc-500/15 text-foreground",
};

export function labelChipClassName(color: LabelColor): string {
  return LABEL_CHIP_CLASSES[color];
}

export function labelSoftTintClassName(color: LabelColor): string {
  return LABEL_SOFT_TINT_CLASSES[color];
}

export function isLabelColor(value: unknown): value is LabelColor {
  return (
    typeof value === "string" &&
    (LABEL_COLORS as readonly string[]).includes(value)
  );
}
