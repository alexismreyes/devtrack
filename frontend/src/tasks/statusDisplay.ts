import type { PublicProjectStatusDto, StatusColor } from "../api/types";

/** Fallback labels for seeded keys while catalog loads (Q-127 / 018). */
export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export function taskStatusLabel(
  status: string,
  catalog?: ReadonlyArray<Pick<PublicProjectStatusDto, "key" | "name">>,
): string {
  const fromCatalog = catalog?.find((entry) => entry.key === status);
  if (fromCatalog !== undefined) {
    return fromCatalog.name;
  }
  return TASK_STATUS_LABELS[status] ?? status;
}

export function taskStatusColor(
  status: string,
  catalog?: ReadonlyArray<Pick<PublicProjectStatusDto, "key" | "color">>,
): StatusColor | undefined {
  return catalog?.find((entry) => entry.key === status)?.color;
}
