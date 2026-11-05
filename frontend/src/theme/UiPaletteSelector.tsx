import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUiPalette } from "./UiPaletteProvider";
import { UI_PALETTES, type UiPaletteId } from "./uiPalettes";

export function UiPaletteSelector() {
  const { palette, setPalette } = useUiPalette();
  const [open, setOpen] = useState(false);

  function selectPalette(id: UiPaletteId): void {
    setPalette(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Color palette"
          className="h-8 gap-2 px-2 text-xs text-devtrack-bar-foreground hover:bg-devtrack-bar-muted/20 hover:text-devtrack-bar-foreground"
          data-testid="ui-palette-selector"
        >
          <span
            aria-hidden
            data-preview-palette={palette}
            className="ui-palette-preview size-5 shrink-0 rounded-full border border-devtrack-bar-muted/50"
          />
          <span className="max-w-20 truncate">{palette}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-3"
        data-testid="ui-palette-picker"
      >
        <div
          role="radiogroup"
          aria-label="Color palette"
          className="grid grid-cols-4 gap-2"
        >
          {UI_PALETTES.map((item) => {
            const selected = palette === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={selected ? `${item.label}, selected` : item.label}
                data-palette-option={item.id}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "bg-accent/60" : "hover:bg-accent/40",
                )}
                onClick={() => selectPalette(item.id)}
              >
                <span
                  aria-hidden
                  data-preview-palette={item.id}
                  className="ui-palette-preview relative flex size-8 items-center justify-center rounded-full border border-border"
                >
                  {selected ? (
                    <Check aria-hidden className="size-3.5 text-white drop-shadow" />
                  ) : null}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
