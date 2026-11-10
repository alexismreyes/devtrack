import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { errorHandler } from "./infrastructure/http/error-handler";
import { AuthController } from "./modules/auth/controller/auth-controller";
import { createRequireAuth } from "./modules/auth/middleware/require-auth";
import type { AuthRepository } from "./modules/auth/repository/auth-repository";
import { createAuthRouter } from "./modules/auth/routes/auth-routes";
import { AuthService } from "./modules/auth/service/auth-service";
import { SystemController } from "./modules/system/controller/system-controller";
import type { SystemRepository } from "./modules/system/repository/system-repository";
import { createSystemRouter } from "./modules/system/routes/system-routes";
import { SystemService } from "./modules/system/service/system-service";
import {
  OwnerMembershipWriteAdapter,
  ProjectMembershipAccessAdapter,
} from "./modules/project-members/access/project-membership-access-adapter";
import { TaskAuthorizationAdapter } from "./modules/project-members/access/task-authorization-adapter";
import { ProjectMembersController } from "./modules/project-members/controller/project-members-controller";
import type { ProjectMembersRepository } from "./modules/project-members/repository/project-members-repository";
import { createProjectMembersRouter } from "./modules/project-members/routes/project-members-routes";
import { ProjectMembersService } from "./modules/project-members/service/project-members-service";
import { ProjectAccessAdapter } from "./modules/projects/access/project-access-adapter";
import { ProjectSnapshotAdapter } from "./modules/projects/access/project-snapshot-adapter";
import {
  ImmediateUnitOfWork,
  type UnitOfWork,
} from "./modules/projects/access/unit-of-work";
import { ProjectCoversController } from "./modules/projects/controller/project-covers-controller";
import { ProjectsController } from "./modules/projects/controller/projects-controller";
import type { ProjectCoversRepository } from "./modules/projects/repository/project-covers-repository";
import type { ProjectsRepository } from "./modules/projects/repository/projects-repository";
import { createProjectCoversRouter } from "./modules/projects/routes/project-covers-routes";
import { createProjectsRouter } from "./modules/projects/routes/projects-routes";
import { ProjectCoversService } from "./modules/projects/service/project-covers-service";
import { ProjectsService } from "./modules/projects/service/projects-service";
import type { ProjectCoverStoragePort } from "./modules/projects/storage/project-cover-storage-port";
import { ActivityController } from "./modules/tasks/controller/activity-controller";
import { AttachmentsController } from "./modules/tasks/controller/attachments-controller";
import { ChecklistsController } from "./modules/tasks/controller/checklists-controller";
import { CommentsController } from "./modules/tasks/controller/comments-controller";
import { LabelsController } from "./modules/tasks/controller/labels-controller";
import { StatusesController } from "./modules/tasks/controller/statuses-controller";
import { TasksController } from "./modules/tasks/controller/tasks-controller";
import { ProjectStatusSeedAdapter } from "./modules/tasks/access/project-status-seed-adapter";
import type { ActivityRepository } from "./modules/tasks/repository/activity-repository";
import type { AttachmentsRepository } from "./modules/tasks/repository/attachments-repository";
import type { ChecklistsRepository } from "./modules/tasks/repository/checklists-repository";
import type { CommentsRepository } from "./modules/tasks/repository/comments-repository";
import type { LabelsRepository } from "./modules/tasks/repository/labels-repository";
import type { StatusesRepository } from "./modules/tasks/repository/statuses-repository";
import type { TaskLabelsRepository } from "./modules/tasks/repository/task-labels-repository";
import type { TasksRepository } from "./modules/tasks/repository/tasks-repository";
import { createActivityRouter } from "./modules/tasks/routes/activity-routes";
import { createAttachmentsRouter } from "./modules/tasks/routes/attachments-routes";
import { createChecklistsRouter } from "./modules/tasks/routes/checklists-routes";
import { createCommentsRouter } from "./modules/tasks/routes/comments-routes";
import { createLabelsRouter } from "./modules/tasks/routes/labels-routes";
import { createStatusesRouter } from "./modules/tasks/routes/statuses-routes";
import { createTasksRouter } from "./modules/tasks/routes/tasks-routes";
import { ActivityService } from "./modules/tasks/service/activity-service";
import { AttachmentsService } from "./modules/tasks/service/attachments-service";
import { ChecklistsService } from "./modules/tasks/service/checklists-service";
import { CommentsService } from "./modules/tasks/service/comments-service";
import { LabelsService } from "./modules/tasks/service/labels-service";
import { StatusesService } from "./modules/tasks/service/statuses-service";
import { TasksService } from "./modules/tasks/service/tasks-service";
import type { AttachmentStoragePort } from "./modules/tasks/storage/attachment-storage-port";
import { UsersController } from "./modules/users/controller/users-controller";
import { UsersIdentityAdapter } from "./modules/users/identity/users-identity-adapter";
import type { UsersRepository } from "./modules/users/repository/users-repository";
import { createUsersRouter } from "./modules/users/routes/users-routes";
import { UsersService } from "./modules/users/service/users-service";

export type AppDependencies = {
  corsOrigin: string;
  systemRepository: SystemRepository;
  usersRepository: UsersRepository;
  authRepository: AuthRepository;
  projectsRepository: ProjectsRepository;
  projectCoversRepository: ProjectCoversRepository;
  projectCoverStorage: ProjectCoverStoragePort;
  tasksRepository: TasksRepository;
  commentsRepository: CommentsRepository;
  activityRepository: ActivityRepository;
  checklistsRepository: ChecklistsRepository;
  attachmentsRepository: AttachmentsRepository;
  attachmentStorage: AttachmentStoragePort;
  labelsRepository: LabelsRepository;
  taskLabelsRepository: TaskLabelsRepository;
  statusesRepository: StatusesRepository;
  projectMembersRepository: ProjectMembersRepository;
  unitOfWork?: UnitOfWork;
};

export function createApp(deps: AppDependencies): Express {
  const app = express();

  const unitOfWork = deps.unitOfWork ?? new ImmediateUnitOfWork();
  const usersIdentity = new UsersIdentityAdapter(deps.usersRepository);
  const authService = new AuthService(
    deps.authRepository,
    usersIdentity,
    unitOfWork,
  );
  const usersService = new UsersService(deps.usersRepository);
  const systemService = new SystemService(deps.systemRepository);
  const projectSnapshots = new ProjectSnapshotAdapter(deps.projectsRepository);
  const projectMembershipAccess = new ProjectMembershipAccessAdapter(
    deps.projectMembersRepository,
    projectSnapshots,
  );
  const ownerMembershipWrite = new OwnerMembershipWriteAdapter(
    deps.projectMembersRepository,
  );
  const statusSeed = new ProjectStatusSeedAdapter(deps.statusesRepository);
  const projectsService = new ProjectsService(
    deps.projectsRepository,
    projectMembershipAccess,
    ownerMembershipWrite,
    unitOfWork,
    statusSeed,
    deps.projectCoversRepository,
  );
  const projectCoversService = new ProjectCoversService(
    deps.projectCoversRepository,
    deps.projectsRepository,
    projectMembershipAccess,
    deps.projectCoverStorage,
    unitOfWork,
  );
  const projectAccess = new ProjectAccessAdapter(deps.projectsRepository);
  const projectMembersService = new ProjectMembersService(
    deps.projectMembersRepository,
    usersIdentity,
    projectSnapshots,
  );
  const taskAuthorization = new TaskAuthorizationAdapter(
    deps.projectMembersRepository,
    projectSnapshots,
  );
  const tasksService = new TasksService(
    deps.tasksRepository,
    projectAccess,
    projectMembershipAccess,
    taskAuthorization,
    deps.activityRepository,
    deps.taskLabelsRepository,
    deps.attachmentsRepository,
    deps.statusesRepository,
    deps.checklistsRepository,
    unitOfWork,
  );
  const commentsService = new CommentsService(
    deps.commentsRepository,
    deps.tasksRepository,
    taskAuthorization,
    usersIdentity,
    deps.activityRepository,
    unitOfWork,
  );
  const activityService = new ActivityService(
    deps.activityRepository,
    deps.tasksRepository,
    taskAuthorization,
    usersIdentity,
  );
  const labelsService = new LabelsService(
    deps.labelsRepository,
    deps.taskLabelsRepository,
    deps.tasksRepository,
    taskAuthorization,
    unitOfWork,
  );
  const statusesService = new StatusesService(
    deps.statusesRepository,
    taskAuthorization,
  );
  const checklistsService = new ChecklistsService(
    deps.checklistsRepository,
    deps.tasksRepository,
    taskAuthorization,
    deps.activityRepository,
    unitOfWork,
  );
  const attachmentsService = new AttachmentsService(
    deps.attachmentsRepository,
    deps.tasksRepository,
    taskAuthorization,
    deps.activityRepository,
    deps.attachmentStorage,
    unitOfWork,
  );

  const authController = new AuthController(authService);
  const usersController = new UsersController(usersService);
  const systemController = new SystemController(systemService);
  const projectsController = new ProjectsController(projectsService);
  const projectCoversController = new ProjectCoversController(
    projectCoversService,
  );
  const projectMembersController = new ProjectMembersController(
    projectMembersService,
  );
  const tasksController = new TasksController(tasksService);
  const commentsController = new CommentsController(commentsService);
  const activityController = new ActivityController(activityService);
  const labelsController = new LabelsController(labelsService);
  const statusesController = new StatusesController(statusesService);
  const checklistsController = new ChecklistsController(checklistsService);
  const attachmentsController = new AttachmentsController(attachmentsService);
  const requireAuth = createRequireAuth(authService);

  app.use(
    cors({
      origin: deps.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(createAuthRouter(authController, requireAuth));
  app.use(createUsersRouter(usersController, requireAuth));
  app.use(createSystemRouter(systemController, requireAuth));
  app.use(createProjectsRouter(projectsController, requireAuth));
  app.use(createProjectCoversRouter(projectCoversController, requireAuth));
  app.use(createProjectMembersRouter(projectMembersController, requireAuth));
  app.use(createTasksRouter(tasksController, requireAuth));
  app.use(createCommentsRouter(commentsController, requireAuth));
  app.use(createActivityRouter(activityController, requireAuth));
  app.use(createLabelsRouter(labelsController, requireAuth));
  app.use(createStatusesRouter(statusesController, requireAuth));
  app.use(createChecklistsRouter(checklistsController, requireAuth));
  app.use(createAttachmentsRouter(attachmentsController, requireAuth));
  app.use(errorHandler);

  return app;
}
