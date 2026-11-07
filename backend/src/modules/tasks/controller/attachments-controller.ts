import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import type { UploadedMemoryFile } from "../../../infrastructure/http/parse-single-file-multipart";
import {
  toPublicAttachmentDto,
  toPublicCoverSummaryDto,
  type AttachmentListResponseDto,
  type CoverResponseDto,
  type SetCoverRequestDto,
} from "../dto/attachment-dtos";
import {
  COVER_IMAGE_CONTENT_TYPES,
} from "../domain/task-attachment";
import type { AttachmentsService } from "../service/attachments-service";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireTaskId(req: Request): string {
  const taskId = req.params.taskId;
  if (typeof taskId !== "string") {
    throw validationError("Invalid task id");
  }
  return taskId;
}

function requireAttachmentId(req: Request): string {
  const attachmentId = req.params.attachmentId;
  if (typeof attachmentId !== "string") {
    throw validationError("Invalid attachment id");
  }
  return attachmentId;
}

function contentDisposition(
  contentType: string,
  originalFilename: string,
): string {
  const safeName = originalFilename.replace(/["\r\n]/g, "_");
  const isImage = (COVER_IMAGE_CONTENT_TYPES as readonly string[]).includes(
    contentType,
  );
  const disposition = isImage ? "inline" : "attachment";
  return `${disposition}; filename="${safeName}"`;
}

export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const attachments = await this.service.listByTask(
      actorId,
      requireTaskId(req),
    );
    const body: AttachmentListResponseDto = {
      attachments: attachments.map(toPublicAttachmentDto),
    };
    res.status(200).json(body);
  }

  async get(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const attachment = await this.service.getById(
      actorId,
      requireTaskId(req),
      requireAttachmentId(req),
    );
    res.status(200).json(toPublicAttachmentDto(attachment));
  }

  async upload(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const file = (req as Request & { file?: UploadedMemoryFile }).file;
    if (file === undefined) {
      throw validationError("File is required");
    }
    const attachment = await this.service.upload(actorId, requireTaskId(req), {
      originalFilename: file.originalname,
      clientContentType: file.mimetype,
      bytes: new Uint8Array(file.buffer),
    });
    res.status(201).json(toPublicAttachmentDto(attachment));
  }

  async content(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const content = await this.service.getContent(
      actorId,
      requireTaskId(req),
      requireAttachmentId(req),
    );
    res.setHeader("Content-Type", content.contentType);
    res.setHeader(
      "Content-Disposition",
      contentDisposition(content.contentType, content.originalFilename),
    );
    res.setHeader("Cache-Control", "private");
    res.setHeader("Content-Length", String(content.sizeBytes));
    res.status(200).send(Buffer.from(content.bytes));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.delete(
      actorId,
      requireTaskId(req),
      requireAttachmentId(req),
    );
    res.status(204).send();
  }

  async setCover(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as SetCoverRequestDto;
    const cover = await this.service.setCover(
      actorId,
      requireTaskId(req),
      body.attachmentId,
    );
    const response: CoverResponseDto = {
      cover: toPublicCoverSummaryDto(cover),
    };
    res.status(200).json(response);
  }

  async clearCover(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const cover = await this.service.clearCover(actorId, requireTaskId(req));
    const response: CoverResponseDto = {
      cover: toPublicCoverSummaryDto(cover),
    };
    res.status(200).json(response);
  }
}
