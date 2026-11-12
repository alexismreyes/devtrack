import { useEffect, useState } from "react";
import { fetchAttachmentContent } from "../api/client";
import type { PublicCoverSummaryDto } from "../api/types";

type TaskDetailCoverHeroProps = {
  taskId: string;
  cover: PublicCoverSummaryDto;
};

/**
 * Decorative TaskDetail top cover hero (040). Reuses Verified 017 authenticated
 * attachment content fetch. Non-interactive (Q-242); short band max-h-36 (Q-241).
 */
export function TaskDetailCoverHero({
  taskId,
  cover,
}: TaskDetailCoverHeroProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load(): Promise<void> {
      try {
        const { blob } = await fetchAttachmentContent(
          taskId,
          cover.attachmentId,
        );
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          createdUrl = null;
          return;
        }
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) {
          setObjectUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [cover.attachmentId, taskId]);

  if (objectUrl === null) {
    return null;
  }

  return (
    <img
      src={objectUrl}
      alt=""
      data-testid="task-detail-cover-hero"
      data-cover-attachment-id={cover.attachmentId}
      draggable={false}
      className="pointer-events-none block h-36 max-h-36 w-full select-none object-cover"
    />
  );
}

export function isImageCoverSummary(
  cover: PublicCoverSummaryDto | null,
): cover is PublicCoverSummaryDto {
  return cover !== null && cover.contentType.startsWith("image/");
}
