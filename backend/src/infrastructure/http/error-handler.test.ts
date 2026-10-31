import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  DuplicateMembershipError,
  MembershipForbiddenError,
  MembershipNotFoundError,
  MembershipProjectNotFoundError,
  MemberUserNotFoundError,
  OwnerMembershipConflictError,
} from "../../modules/project-members/domain/errors";
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

  it("maps membership domain errors to the existing envelope", async () => {
    const forbiddenRes = await request(
      appThatThrows(new MembershipForbiddenError()),
    ).get("/boom");
    const missingProject = await request(
      appThatThrows(new MembershipProjectNotFoundError()),
    ).get("/boom");
    const missingUser = await request(
      appThatThrows(new MemberUserNotFoundError()),
    ).get("/boom");
    const missingMember = await request(
      appThatThrows(new MembershipNotFoundError()),
    ).get("/boom");
    const duplicate = await request(
      appThatThrows(new DuplicateMembershipError()),
    ).get("/boom");
    const ownerConflict = await request(
      appThatThrows(new OwnerMembershipConflictError()),
    ).get("/boom");

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe("FORBIDDEN");
    expect(missingProject.status).toBe(404);
    expect(missingProject.body.error.code).toBe("NOT_FOUND");
    expect(missingUser.status).toBe(404);
    expect(missingUser.body.error.code).toBe("NOT_FOUND");
    expect(missingMember.status).toBe(404);
    expect(missingMember.body.error.code).toBe("NOT_FOUND");
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
    expect(ownerConflict.status).toBe(409);
    expect(ownerConflict.body.error.code).toBe("CONFLICT");
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
