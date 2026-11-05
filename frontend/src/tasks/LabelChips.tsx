import type { TaskEmbeddedLabelDto } from "../api/types";
import { cn } from "@/lib/utils";
import { labelChipClassName } from "./labelColors";

type LabelChipsProps = {
  labels: TaskEmbeddedLabelDto[];
  className?: string;
};

export function LabelChips({ labels, className }: LabelChipsProps) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Task labels"
      className={cn("flex flex-wrap gap-1 px-2", className)}
    >
      {labels.map((label) => (
        <li key={label.id}>
          <span
            data-label-color={label.color}
            className={cn(
              "inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
              labelChipClassName(label.color),
            )}
          >
            {label.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
