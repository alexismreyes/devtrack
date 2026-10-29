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
import { ProjectAccessAdapter } from "./modules/projects/access/project-access-adapter";
import { ProjectsController } from "./modules/projects/controller/projects-controller";
import type { ProjectsRepository } from "./modules/projects/repository/projects-repository";
import { createProjectsRouter } from "./modules/projects/routes/projects-routes";
import { ProjectsService } from "./modules/projects/service/projects-service";
import { TasksController } from "./modules/tasks/controller/tasks-controller";
import type { TasksRepository } from "./modules/tasks/repository/tasks-repository";
import { createTasksRouter } from "./modules/tasks/routes/tasks-routes";
import { TasksService } from "./modules/tasks/service/tasks-service";
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
  tasksRepository: TasksRepository;
};

export function createApp(deps: AppDependencies): Express {
  const app = express();

  const usersIdentity = new UsersIdentityAdapter(deps.usersRepository);
  const authService = new AuthService(deps.authRepository, usersIdentity);
  const usersService = new UsersService(deps.usersRepository);
  const systemService = new SystemService(deps.systemRepository);
  const projectsService = new ProjectsService(deps.projectsRepository);
  const projectAccess = new ProjectAccessAdapter(deps.projectsRepository);
  const tasksService = new TasksService(deps.tasksRepository, projectAccess);

  const authController = new AuthController(authService);
  const usersController = new UsersController(usersService);
  const systemController = new SystemController(systemService);
  const projectsController = new ProjectsController(projectsService);
  const tasksController = new TasksController(tasksService);
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
  app.use(createTasksRouter(tasksController, requireAuth));
  app.use(errorHandler);

  return app;
}
