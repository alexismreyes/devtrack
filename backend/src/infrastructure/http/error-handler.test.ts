import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  ProjectArchivedError,
  ProjectForbiddenError,
  ProjectNotFoundError,
} from "../../modules/projects/domain/errors";
import {
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../../modules/tasks/domain/errors";
import {
  ProfileForbiddenError,
  UserNotFoundError,
} from "../../modules/users/domain/errors";
import { errorHandler } from "./error-handler";

function appThatThrows(error: Error) {
  const app = express();
  app.get("/boom", () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler domain mapping", () => {
  it("maps ProfileForbiddenError to 403 FORBIDDEN", async () => {
    const response = await request(appThatThrows(new ProfileForbiddenError())).get(
      "/boom",
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Not allowed to access this profile",
      },
    });
  });

  it("maps ProjectForbiddenError to 403 FORBIDDEN", async () => {
    const response = await request(appThatThrows(new ProjectForbiddenError())).get(
      "/boom",
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Not allowed to access this project",
      },
    });
  });

  it("maps ProjectNotFoundError to 404 NOT_FOUND", async () => {
    const response = await request(appThatThrows(new ProjectNotFoundError())).get(
      "/boom",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Project was not found",
      },
    });
  });

  it("does not map UserNotFoundError through the project NOT_FOUND path", async () => {
    const response = await request(appThatThrows(new UserNotFoundError())).get(
      "/boom",
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required",
      },
    });
  });

  it("maps ProjectArchivedError to 409 CONFLICT", async () => {
    const response = await request(appThatThrows(new ProjectArchivedError())).get(
      "/boom",
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "CONFLICT",
        message: "Archived projects cannot be updated",
      },
    });
  });

  it("maps TaskNotFoundError to 404 NOT_FOUND", async () => {
    const response = await request(appThatThrows(new TaskNotFoundError())).get(
      "/boom",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Task was not found",
      },
    });
  });

  it("maps TaskParentArchivedError to 409 CONFLICT", async () => {
    const response = await request(
      appThatThrows(new TaskParentArchivedError()),
    ).get("/boom");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "CONFLICT",
        message: "Cannot modify tasks on an archived project",
      },
    });
  });

  it("does not map UserNotFoundError through the task NOT_FOUND path", async () => {
    const response = await request(appThatThrows(new UserNotFoundError())).get(
      "/boom",
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});
