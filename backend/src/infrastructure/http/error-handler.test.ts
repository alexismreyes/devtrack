import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ProfileForbiddenError } from "../../modules/users/domain/errors";
import { errorHandler } from "./error-handler";

describe("errorHandler domain mapping", () => {
  it("maps ProfileForbiddenError to 403 FORBIDDEN", async () => {
    const app = express();
    app.get("/cross-user", () => {
      throw new ProfileForbiddenError();
    });
    app.use(errorHandler);

    const response = await request(app).get("/cross-user");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Not allowed to access this profile",
      },
    });
  });
});
