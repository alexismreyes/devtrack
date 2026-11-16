import type { ActivityView } from "../service/activity-service";

export type PublicActivityDto = {
  id: string;
  taskId: string;
  kind: ActivityView["kind"];
  actorUserId: string;
  actorDisplayName: string;
  createdAt: string;
  payload: ActivityView["payload"];
};

export type ActivityListResponseDto = {
  activity: PublicActivityDto[];
  nextCursor: string | null;
};

export function toPublicActivityDto(event: ActivityView): PublicActivityDto {
  return {
    id: event.id,
    taskId: event.taskId,
    kind: event.kind,
    actorUserId: event.actorUserId,
    actorDisplayName: event.actorDisplayName,
    createdAt: event.createdAt.toISOString(),
    payload: event.payload,
  };
}
