import type { TaskCoverSummary } from "../domain/task-attachment";
import type { AttachmentView } from "../service/attachments-service";

export type PublicAttachmentDto = {
  id: string;
  taskId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedByUserId: string;
  isCover: boolean;
};

export type AttachmentListResponseDto = {
  attachments: PublicAttachmentDto[];
};

export type PublicCoverSummaryDto = {
  attachmentId: string;
  contentType: string;
};

export type CoverResponseDto = {
  cover: PublicCoverSummaryDto | null;
};

export type SetCoverRequestDto = {
  attachmentId: string;
};

export function toPublicAttachmentDto(
  attachment: AttachmentView,
): PublicAttachmentDto {
  return {
    id: attachment.id,
    taskId: attachment.taskId,
    originalFilename: attachment.originalFilename,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    uploadedByUserId: attachment.uploadedByUserId,
    isCover: attachment.isCover,
  };
}

export function toPublicCoverSummaryDto(
  cover: TaskCoverSummary | null,
): PublicCoverSummaryDto | null {
  if (cover === null) {
    return null;
  }
  return {
    attachmentId: cover.attachmentId,
    contentType: cover.contentType,
  };
}
