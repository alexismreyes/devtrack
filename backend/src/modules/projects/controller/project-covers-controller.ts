import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import type { UploadedMemoryFile } from "../../../infrastructure/http/parse-single-file-multipart";
import {
  toPublicProjectCoverSummaryDto,
  type ProjectCoverResponseDto,
} from "../dto/project-dtos";
import type { ProjectCoversService } from "../service/project-covers-service";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireProjectId(req: Request): string {
  const projectId = req.params.projectId;
  if (typeof projectId !== "string") {
    throw validationError("Invalid project id");
  }
  return projectId;
}

export class ProjectCoversController {
  constructor(private readonly service: ProjectCoversService) {}

  async upload(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const file = (req as Request & { file?: UploadedMemoryFile }).file;
    if (file === undefined) {
      throw validationError("File is required");
    }
    const cover = await this.service.upload(actorId, requireProjectId(req), {
      originalFilename: file.originalname,
      clientContentType: file.mimetype,
      bytes: new Uint8Array(file.buffer),
    });
    const body: ProjectCoverResponseDto = {
      cover: toPublicProjectCoverSummaryDto(cover),
    };
    res.status(200).json(body);
  }

  async content(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const content = await this.service.getContent(
      actorId,
      requireProjectId(req),
    );
    const safeName = content.originalFilename.replace(/["\r\n]/g, "_");
    res.setHeader("Content-Type", content.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName}"`,
    );
    res.setHeader("Cache-Control", "private");
    res.setHeader("Content-Length", String(content.sizeBytes));
    res.status(200).send(Buffer.from(content.bytes));
  }

  async clear(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.clear(actorId, requireProjectId(req));
    res.status(204).send();
  }
}
