import type { NextFunction, Request, Response } from "express";
import { validationError } from "./app-error";

export type UploadedMemoryFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * Minimal single-file multipart parser (field name `file`) for educational use.
 * Enforces maxBytes; rejects multiple files / missing boundary.
 */
export function createSingleFileMultipartMiddleware(options: {
  fieldName: string;
  maxBytes: number;
}) {
  return function parseSingleFileMultipart(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    const contentType = req.headers["content-type"];
    if (typeof contentType !== "string") {
      next(validationError("Invalid multipart upload"));
      return;
    }
    const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
    const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2]?.trim();
    if (!boundary) {
      next(validationError("Invalid multipart upload"));
      return;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let failed = false;

    req.on("data", (chunk: Buffer) => {
      if (failed) {
        return;
      }
      total += chunk.length;
      if (total > options.maxBytes + 64 * 1024) {
        // Allow small multipart overhead beyond file max; hard-stop runaway bodies.
        failed = true;
        next(validationError("Attachment exceeds the maximum allowed size"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("error", (err) => {
      if (!failed) {
        next(err);
      }
    });

    req.on("end", () => {
      if (failed) {
        return;
      }
      try {
        const body = Buffer.concat(chunks);
        const parsed = parseMultipartBuffer(
          body,
          boundary,
          options.fieldName,
          options.maxBytes,
        );
        if (parsed === null) {
          next(validationError("File is required"));
          return;
        }
        if (parsed.size > options.maxBytes) {
          next(validationError("Attachment exceeds the maximum allowed size"));
          return;
        }
        (req as Request & { file?: UploadedMemoryFile }).file = parsed;
        next();
      } catch (err) {
        if (err instanceof Error && err.message === "SIZE") {
          next(validationError("Attachment exceeds the maximum allowed size"));
          return;
        }
        next(validationError("Invalid multipart upload"));
      }
    });
  };
}

function parseMultipartBuffer(
  body: Buffer,
  boundary: string,
  fieldName: string,
  maxBytes: number,
): UploadedMemoryFile | null {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, delimiter);
  let found: UploadedMemoryFile | null = null;

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }
    // Skip epilogue markers.
    if (part[0] === 0x2d && part[1] === 0x2d) {
      continue;
    }
    let payload = part;
    if (payload[0] === 0x0d && payload[1] === 0x0a) {
      payload = payload.subarray(2);
    }
    const headerEnd = indexOf(payload, Buffer.from("\r\n\r\n"));
    if (headerEnd < 0) {
      continue;
    }
    const headerText = payload.subarray(0, headerEnd).toString("utf8");
    let content = payload.subarray(headerEnd + 4);
    if (
      content.length >= 2 &&
      content[content.length - 2] === 0x0d &&
      content[content.length - 1] === 0x0a
    ) {
      content = content.subarray(0, content.length - 2);
    }

    const nameMatch = /name="([^"]+)"/i.exec(headerText);
    const filenameMatch = /filename="([^"]*)"/i.exec(headerText);
    if (nameMatch?.[1] !== fieldName || filenameMatch === null) {
      continue;
    }
    if (found !== null) {
      throw new Error("MULTIPLE");
    }
    if (content.length > maxBytes) {
      throw new Error("SIZE");
    }
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);
    found = {
      fieldname: fieldName,
      originalname: filenameMatch[1] || "upload",
      encoding: "7bit",
      mimetype: typeMatch?.[1]?.trim() || "application/octet-stream",
      size: content.length,
      buffer: Buffer.from(content),
    };
  }

  return found;
}

function splitBuffer(source: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let index = indexOf(source, delimiter, start);
  while (index >= 0) {
    if (index > start) {
      parts.push(source.subarray(start, index));
    }
    start = index + delimiter.length;
    index = indexOf(source, delimiter, start);
  }
  if (start < source.length) {
    parts.push(source.subarray(start));
  }
  return parts;
}

function indexOf(source: Buffer, search: Buffer, from = 0): number {
  if (search.length === 0) {
    return from;
  }
  outer: for (let i = from; i <= source.length - search.length; i += 1) {
    for (let j = 0; j < search.length; j += 1) {
      if (source[i + j] !== search[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}
