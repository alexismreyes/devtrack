import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./error-handler";
import {
  createSingleFileMultipartMiddleware,
  type UploadedMemoryFile,
} from "./parse-single-file-multipart";

describe("parseSingleFileMultipart", () => {
  it("parses a single file field into req.file", async () => {
    const app = express();
    app.post(
      "/upload",
      createSingleFileMultipartMiddleware({ fieldName: "file", maxBytes: 1024 }),
      (req, res) => {
        const file = (req as express.Request & { file?: UploadedMemoryFile }).file;
        res.status(200).json({
          name: file?.originalname,
          type: file?.mimetype,
          size: file?.size,
          bytes: file ? Array.from(file.buffer) : [],
        });
      },
    );
    app.use(errorHandler);

    const response = await request(app)
      .post("/upload")
      .attach("file", Buffer.from([1, 2, 3]), {
        filename: "a.bin",
        contentType: "application/octet-stream",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: "a.bin",
      type: "application/octet-stream",
      size: 3,
      bytes: [1, 2, 3],
    });
  });
});
