import type { PublicProjectStatusDto } from "../api/types";

export const DEFAULT_PROJECT_STATUSES: PublicProjectStatusDto[] = [
  {
    id: "status-todo",
    projectId: "proj-1",
    key: "TODO",
    name: "To do",
    color: "GRAY",
    isSystem: true,
    isCompleted: false,
    position: 0,
    createdAt: "2026-11-06T12:00:00.000Z",
  },
  {
    id: "status-in-progress",
    projectId: "proj-1",
    key: "IN_PROGRESS",
    name: "In progress",
    color: "BLUE",
    isSystem: true,
    isCompleted: false,
    position: 1,
    createdAt: "2026-11-06T12:00:00.000Z",
  },
  {
    id: "status-done",
    projectId: "proj-1",
    key: "DONE",
    name: "Done",
    color: "GREEN",
    isSystem: true,
    isCompleted: true,
    position: 2,
    createdAt: "2026-11-06T12:00:00.000Z",
  },
];

export function isStatusesListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/statuses$/.test(url);
}
