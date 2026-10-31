export type ProjectCover = {
  initials: string;
  backgroundClass: string;
  foregroundClass: string;
};

const PROJECT_COVER_PALETTE = [
  { backgroundClass: "bg-primary", foregroundClass: "text-primary-foreground" },
  { backgroundClass: "bg-accent", foregroundClass: "text-accent-foreground" },
  { backgroundClass: "bg-devtrack-bar", foregroundClass: "text-devtrack-bar-foreground" },
  { backgroundClass: "bg-secondary", foregroundClass: "text-secondary-foreground" },
  { backgroundClass: "bg-[oklch(0.42_0.08_220)]", foregroundClass: "text-[oklch(0.98_0.01_85)]" },
  { backgroundClass: "bg-[oklch(0.48_0.1_40)]", foregroundClass: "text-[oklch(0.98_0.01_85)]" },
  { backgroundClass: "bg-[oklch(0.40_0.07_280)]", foregroundClass: "text-[oklch(0.98_0.01_85)]" },
  { backgroundClass: "bg-[oklch(0.45_0.09_145)]", foregroundClass: "text-[oklch(0.98_0.01_85)]" },
] as const;

function firstGrapheme(value: string): string {
  const chars = Array.from(value);
  return chars[0] ?? "";
}

export function projectInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    return "?";
  }
  const tokens = trimmed.split(/\s+/u).filter((token) => token.length > 0);
  if (tokens.length >= 2) {
    const first = tokens[0];
    const second = tokens[1];
    if (first === undefined || second === undefined) {
      return "?";
    }
    return `${firstGrapheme(first)}${firstGrapheme(second)}`.toUpperCase();
  }
  const token = tokens[0] ?? "";
  const chars = Array.from(token);
  if (chars.length >= 2) {
    return `${chars[0]}${chars[1]}`.toUpperCase();
  }
  if (chars.length === 1 && chars[0] !== undefined) {
    return chars[0].toUpperCase();
  }
  return "?";
}

function hashName(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

export function projectCoverFromName(name: string): ProjectCover {
  const initials = projectInitials(name);
  const paletteIndex = hashName(name) % PROJECT_COVER_PALETTE.length;
  const swatch = PROJECT_COVER_PALETTE[paletteIndex] ?? PROJECT_COVER_PALETTE[0];
  return {
    initials,
    backgroundClass: swatch.backgroundClass,
    foregroundClass: swatch.foregroundClass,
  };
}
