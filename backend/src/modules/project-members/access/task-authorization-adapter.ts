import type { ProjectSnapshotPort } from "../../projects/access/project-snapshot-port";
import {
  assertAuthorizedForOperation,
  type ProjectOperation,
} from "../domain/authorization";
import { MembershipProjectNotFoundError } from "../domain/errors";
import type { ProjectMembersRepository } from "../repository/project-members-repository";
import type {
  AuthorizedProjectSnapshot,
  TaskAuthorizationPort,
} from "./task-authorization-port";

export class TaskAuthorizationAdapter implements TaskAuthorizationPort {
  constructor(
    private readonly members: ProjectMembersRepository,
    private readonly projects: ProjectSnapshotPort,
  ) {}

  requireTaskRead(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot> {
    return this.require(actorId, projectId, "read_task");
  }

  requireTaskWrite(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot> {
    return this.require(actorId, projectId, "write_task");
  }

  private async require(
    actorId: string,
    projectId: string,
    operation: ProjectOperation,
  ): Promise<AuthorizedProjectSnapshot> {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new MembershipProjectNotFoundError();
    }
    const membership = await this.members.findByProjectAndUser(
      projectId,
      actorId,
    );
    assertAuthorizedForOperation(
      {
        actorId,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
        membershipRole: membership?.role ?? null,
      },
      operation,
    );
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      archivedAt: project.archivedAt,
    };
  }
}
