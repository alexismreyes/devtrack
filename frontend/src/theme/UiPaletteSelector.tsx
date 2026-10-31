import { cn, nativeSelectClassName } from "@/lib/utils";
import { useUiPalette } from "./UiPaletteProvider";
import { isUiPaletteId, UI_PALETTES } from "./uiPalettes";

export function UiPaletteSelector() {
  const { palette, setPalette } = useUiPalette();

  return (
    <select
      aria-label="Color palette"
      className={cn(
        nativeSelectClassName,
        "h-8 w-36 border-devtrack-bar-muted/40 bg-transparent px-2 text-xs text-devtrack-bar-foreground",
      )}
      value={palette}
      onChange={(event) => {
        const next = event.target.value;
        if (isUiPaletteId(next)) {
          setPalette(next);
        }
      }}
    >
      {UI_PALETTES.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
