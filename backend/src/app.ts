import cors from "cors";
import express, { type Express } from "express";
import { errorHandler } from "./infrastructure/http/error-handler";
import { SystemController } from "./modules/system/controller/system-controller";
import type { SystemRepository } from "./modules/system/repository/system-repository";
import { createSystemRouter } from "./modules/system/routes/system-routes";
import { SystemService } from "./modules/system/service/system-service";

export type AppDependencies = {
  corsOrigin: string;
  systemRepository: SystemRepository;
};

export function createApp(deps: AppDependencies): Express {
  const app = express();
  const service = new SystemService(deps.systemRepository);
  const controller = new SystemController(service);

  app.use(cors({ origin: deps.corsOrigin }));
  app.use(express.json());
  app.use(createSystemRouter(controller));
  app.use(errorHandler);

  return app;
}
