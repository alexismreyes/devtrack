export const UI_PALETTE_STORAGE_KEY = "devtrack.uiPalette";

export const UI_PALETTE_IDS = [
  "Forest",
  "Ocean",
  "Sunset",
  "Violet",
  "MidnightAurora",
  "ObsidianGold",
  "CyberpunkDreams",
  "DeepOcean",
  "CherryBlossom",
  "ToxicEmerald",
  "CosmicLavender",
  "NeoGlass",
  "Dribbble",
  "OledBlack",
  "LuxuryDark",
  "CyberAesthetic",
  "Aurora",
  "Ember",
  "Lagoon",
  "Twilight",
  "Citrus",
  "Magma",
  "Glacier",
] as const;

export type UiPaletteId = (typeof UI_PALETTE_IDS)[number];

export const DEFAULT_UI_PALETTE: UiPaletteId = "Forest";

export type UiPaletteKind = "solid" | "gradient";

export type UiPaletteDefinition = {
  id: UiPaletteId;
  /** Display label; may differ from id (033 Q-206 / 039 Q-232). */
  label: string;
  kind: UiPaletteKind;
};

export const UI_PALETTES: readonly UiPaletteDefinition[] = [
  { id: "Forest", label: "Forest", kind: "solid" },
  { id: "Ocean", label: "Ocean", kind: "solid" },
  { id: "Sunset", label: "Sunset", kind: "solid" },
  { id: "Violet", label: "Violet", kind: "solid" },
  { id: "MidnightAurora", label: "Midnight Aurora", kind: "solid" },
  { id: "ObsidianGold", label: "Obsidian & Gold", kind: "solid" },
  { id: "CyberpunkDreams", label: "Cyberpunk Dreams", kind: "solid" },
  { id: "DeepOcean", label: "Deep Ocean", kind: "solid" },
  { id: "CherryBlossom", label: "Cherry Blossom", kind: "solid" },
  { id: "ToxicEmerald", label: "Toxic Emerald", kind: "solid" },
  { id: "CosmicLavender", label: "Cosmic Lavender", kind: "solid" },
  { id: "NeoGlass", label: "Neo-Glass", kind: "solid" },
  { id: "Dribbble", label: "Dribbble Aesthetic", kind: "solid" },
  { id: "OledBlack", label: "OLED Black", kind: "solid" },
  { id: "LuxuryDark", label: "Luxury Dark", kind: "solid" },
  { id: "CyberAesthetic", label: "Cyber Aesthetic", kind: "solid" },
  { id: "Aurora", label: "Aurora", kind: "gradient" },
  { id: "Ember", label: "Ember", kind: "gradient" },
  { id: "Lagoon", label: "Lagoon", kind: "gradient" },
  { id: "Twilight", label: "Twilight", kind: "gradient" },
  { id: "Citrus", label: "Citrus", kind: "gradient" },
  { id: "Magma", label: "Magma", kind: "gradient" },
  { id: "Glacier", label: "Glacier", kind: "gradient" },
];

/** Shared surface class for checklist / dashboard / profile eyecandy (023). */
export const EYECANDY_SURFACE_CLASS = "bg-eyecandy-surface";

export function isUiPaletteId(value: string): value is UiPaletteId {
  return (UI_PALETTE_IDS as readonly string[]).includes(value);
}

export function applyUiPaletteToDocument(id: UiPaletteId): void {
  document.documentElement.dataset.palette = id;
}

export function readStoredUiPalette(): UiPaletteId {
  try {
    const stored = window.localStorage.getItem(UI_PALETTE_STORAGE_KEY);
    if (stored === null || !isUiPaletteId(stored)) {
      return DEFAULT_UI_PALETTE;
    }
    return stored;
  } catch {
    return DEFAULT_UI_PALETTE;
  }
}

export function writeStoredUiPalette(id: UiPaletteId): void {
  try {
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, id);
  } catch {
    // Ignore quota / private-mode failures; the in-memory palette still applies.
  }
}
