import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadEnvFiles(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }

  // Host/tests fallback when Compose env is not injected (Q-131).
  if (
    process.env.ATTACHMENTS_ROOT === undefined ||
    process.env.ATTACHMENTS_ROOT.trim() === ""
  ) {
    process.env.ATTACHMENTS_ROOT = "./data/attachments";
  }

  // Host/tests fallback when Compose env is not injected (Q-159).
  if (
    process.env.PROJECT_COVERS_ROOT === undefined ||
    process.env.PROJECT_COVERS_ROOT.trim() === ""
  ) {
    process.env.PROJECT_COVERS_ROOT = "./data/project-covers";
  }

  // Host/tests fallback when Compose env is not injected (Q-223).
  if (
    process.env.PROJECT_BOARD_BACKGROUNDS_ROOT === undefined ||
    process.env.PROJECT_BOARD_BACKGROUNDS_ROOT.trim() === ""
  ) {
    process.env.PROJECT_BOARD_BACKGROUNDS_ROOT = "./data/project-board-backgrounds";
  }
}
