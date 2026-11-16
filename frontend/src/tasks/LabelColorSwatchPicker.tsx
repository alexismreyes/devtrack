import { Check } from "lucide-react";
import type { LabelColor } from "../api/types";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, labelChipClassName } from "./labelColors";

type LabelColorSwatchPickerProps = {
  value: LabelColor;
  onChange: (color: LabelColor) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
};

export function LabelColorSwatchPicker({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "Label color",
  id,
}: LabelColorSwatchPickerProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-5 gap-2"
      data-testid="label-color-swatch-picker"
    >
      {LABEL_COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={selected ? `${color}, selected` : color}
            disabled={disabled}
            data-label-color={color}
            className={cn(
              "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              labelChipClassName(color),
            )}
            onClick={() => onChange(color)}
          >
            {selected ? <Check aria-hidden className="size-4" /> : null}
          </button>
        );
      })}
    </div>
  );
}
